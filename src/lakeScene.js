import * as THREE from "three";

const MAX_RIPPLES = 24;
const POINTER_WATER_MAX_Y = 0.565;
const assetPath = (path) => `${import.meta.env.BASE_URL}${path}`;
const BACKDROP_TEXTURES = [
  ["uBackdrop", assetPath("assets/timecycle-clean/lake-day-clean.png")],
  ["uBackdropSunset", assetPath("assets/timecycle-clean/lake-sunset-clean.png")],
  ["uBackdropTwilight", assetPath("assets/timecycle-clean/lake-twilight-clean.png")],
  ["uBackdropNight", assetPath("assets/timecycle-clean/lake-night-clean.png")],
];
const CLOUD_TEXTURES = [
  ["uCloudHigh", assetPath("assets/clouds/cloud-high-mask.png")],
  ["uCloudHorizon", assetPath("assets/clouds/cloud-horizon-mask.png")],
];
const TORII_TEXTURES = [
  ["uToriiDay", assetPath("assets/landmarks/timecycle/torii-day.png")],
  ["uToriiSunset", assetPath("assets/landmarks/timecycle/torii-sunset.png")],
  ["uToriiTwilight", assetPath("assets/landmarks/timecycle/torii-twilight.png")],
  ["uToriiNight", assetPath("assets/landmarks/timecycle/torii-night.png")],
];

const vertexShader = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const fragmentShader = `
  precision highp float;

  uniform float uTime;
  uniform vec2 uResolution;
  uniform sampler2D uBackdrop;
  uniform sampler2D uBackdropSunset;
  uniform sampler2D uBackdropTwilight;
  uniform sampler2D uBackdropNight;
  uniform float uBackdropReady;
  uniform sampler2D uCloudHigh;
  uniform sampler2D uCloudHorizon;
  uniform float uCloudReady;
  uniform sampler2D uToriiDay;
  uniform sampler2D uToriiSunset;
  uniform sampler2D uToriiTwilight;
  uniform sampler2D uToriiNight;
  uniform float uToriiReady;
  uniform float uSongProgress;
  uniform vec4 uRipples[${MAX_RIPPLES}];
  uniform float uAmplitude;
  uniform float uBeatEnergy;
  uniform float uChorus;

  varying vec2 vUv;

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }

  float fbm(vec2 p) {
    float value = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 5; i++) {
      value += amp * noise(p);
      p *= 2.02;
      amp *= 0.5;
    }
    return value;
  }

  vec2 lakeCoord(vec2 p, float horizon, float aspect) {
    float waterT = clamp((horizon - p.y) / horizon, 0.0, 1.0);
    float planeZ = 1.0 / (waterT + 0.075);
    float planeX = (p.x - 0.5) * aspect * planeZ;
    return vec2(planeX, planeZ);
  }

  vec2 backdropCoord(vec2 p) {
    return clamp(vec2(p.x, p.y - 0.045), 0.0, 1.0);
  }

  float sunsetPhase(float progress) {
    return smoothstep(0.12, 0.40, progress) * (1.0 - smoothstep(0.48, 0.70, progress));
  }

  float twilightPhase(float progress) {
    return smoothstep(0.42, 0.66, progress) * (1.0 - smoothstep(0.70, 0.90, progress));
  }

  float nightPhase(float progress) {
    return smoothstep(0.70, 0.98, progress);
  }

  vec3 sampleBackdrop(vec2 p) {
    vec2 coord = backdropCoord(p);
    vec3 day = texture2D(uBackdrop, coord).rgb;
    vec3 sunset = texture2D(uBackdropSunset, coord).rgb;
    vec3 twilight = texture2D(uBackdropTwilight, coord).rgb;
    vec3 night = texture2D(uBackdropNight, coord).rgb;
    vec3 color = mix(day, sunset, smoothstep(0.10, 0.42, uSongProgress));
    color = mix(color, twilight, smoothstep(0.44, 0.70, uSongProgress));
    color = mix(color, night, nightPhase(uSongProgress));
    return color;
  }

  float cloudLuma(vec3 mask) {
    return dot(mask, vec3(0.299, 0.587, 0.114));
  }

  float sampleHighCloudMask(vec2 uv) {
    vec3 mask = texture2D(uCloudHigh, fract(uv)).rgb;
    return smoothstep(0.12, 0.86, cloudLuma(mask));
  }

  float sampleHorizonCloudMask(vec2 uv) {
    vec3 mask = texture2D(uCloudHorizon, fract(uv)).rgb;
    float luma = dot(mask, vec3(0.299, 0.587, 0.114));
    return smoothstep(0.12, 0.86, luma);
  }

  vec2 toriiSize(float aspect) {
    float toriiAspect = 1.248;
    float narrow = 1.0 - smoothstep(0.55, 1.20, aspect);
    float height = mix(0.170, 0.108, narrow);
    float width = height * toriiAspect / max(aspect, 0.38);
    return vec2(min(width, 0.34), height);
  }

  float toriiWaterlineLocal() {
    return 0.108;
  }

  float toriiSceneWaterline(float horizon) {
    return mix(horizon, 0.0, 0.12);
  }

  vec2 toriiOrigin(float horizon, float aspect) {
    vec2 size = toriiSize(aspect);
    vec2 waterline = vec2(0.341, toriiSceneWaterline(horizon));
    return vec2(waterline.x - size.x * 0.5, waterline.y - size.y * toriiWaterlineLocal());
  }

  vec4 blendToriiAssets(vec2 local, float bounds) {
    vec2 sampleUv = clamp(local, 0.0, 1.0);
    vec4 day = texture2D(uToriiDay, sampleUv);
    vec4 sunset = texture2D(uToriiSunset, sampleUv);
    vec4 twilight = texture2D(uToriiTwilight, sampleUv);
    vec4 night = texture2D(uToriiNight, sampleUv);
    vec4 color = mix(day, sunset, smoothstep(0.10, 0.42, uSongProgress));
    color = mix(color, twilight, smoothstep(0.44, 0.70, uSongProgress));
    color = mix(color, night, nightPhase(uSongProgress));
    color.a *= bounds * uToriiReady;
    return color;
  }

  float stripeMask(float v, float center, float radius) {
    return 1.0 - smoothstep(radius * 0.62, radius, abs(v - center));
  }

  float rangeMask(float v, float start, float end, float feather) {
    return smoothstep(start - feather, start + feather, v)
      * (1.0 - smoothstep(end - feather, end + feather, v));
  }

  vec3 shadeToriiSprite(vec4 tex, vec2 local) {
    float object = smoothstep(0.04, 0.42, tex.a);
    float sunset = sunsetPhase(uSongProgress);
    float twilight = twilightPhase(uSongProgress);
    float night = nightPhase(uSongProgress);

    float majorPosts = max(
      stripeMask(local.x, 0.365, 0.060),
      stripeMask(local.x, 0.635, 0.060)
    ) * rangeMask(local.y, 0.16, 0.91, 0.030);
    float smallPosts = max(
      max(stripeMask(local.x, 0.205, 0.040), stripeMask(local.x, 0.305, 0.040)),
      max(stripeMask(local.x, 0.695, 0.040), stripeMask(local.x, 0.795, 0.040))
    ) * rangeMask(local.y, 0.04, 0.43, 0.030);
    float posts = max(majorPosts, smallPosts);
    float topBeam = rangeMask(local.y, 0.83, 0.99, 0.035)
      * rangeMask(local.x, 0.05, 0.95, 0.045);
    float crossBeam = rangeMask(local.y, 0.59, 0.75, 0.026)
      * rangeMask(local.x, 0.14, 0.86, 0.040);
    float lowerBase = (1.0 - smoothstep(toriiWaterlineLocal() + 0.02, toriiWaterlineLocal() + 0.24, local.y))
      * smoothstep(0.02, toriiWaterlineLocal() + 0.04, local.y);

    float verticalLight = smoothstep(0.30, 1.0, local.y);
    float verticalFalloff = 1.0 - smoothstep(0.13, 0.84, local.y);
    float topBeamUpper = topBeam * smoothstep(0.90, 0.985, local.y);
    float topBeamUnder = topBeam * (1.0 - smoothstep(0.835, 0.915, local.y));
    float crossBeamUpper = crossBeam * smoothstep(0.665, 0.745, local.y);
    float crossBeamUnder = crossBeam * (1.0 - smoothstep(0.595, 0.675, local.y));
    float postTopLight = posts * verticalLight * (1.0 - topBeamUnder * 0.55 - crossBeamUnder * 0.35);
    float alphaAbove = texture2D(uToriiDay, clamp(local + vec2(0.0, 0.012), 0.0, 1.0)).a;
    float alphaBelow = texture2D(uToriiDay, clamp(local - vec2(0.0, 0.014), 0.0, 1.0)).a;
    float topExposedEdge = object * (1.0 - smoothstep(0.06, 0.36, alphaAbove))
      * (topBeam * 0.96 + crossBeam * 0.62 + posts * 0.30 + smallPosts * 0.32);
    float lowerExposedEdge = object * (1.0 - smoothstep(0.06, 0.36, alphaBelow))
      * (topBeam * 0.58 + crossBeam * 0.54 + posts * 0.20 + smallPosts * 0.25);
    float overheadLight = topBeamUpper * 0.90
      + crossBeamUpper * 0.58
      + postTopLight * 0.20
      + topExposedEdge * 0.88;

    float underside = topBeamUnder * 0.92
      + crossBeamUnder * 0.72;
    float innerShade = rangeMask(local.x, 0.34, 0.66, 0.10)
      * rangeMask(local.y, 0.44, 0.82, 0.09);
    float castFromUpperBeams = posts * (
      rangeMask(local.y, 0.705, 0.815, 0.040) * 0.42
      + rangeMask(local.y, 0.505, 0.625, 0.040) * 0.30
    );
    float postLowerShade = posts * verticalFalloff * 0.52;
    float structuralShadow = underside * (0.29 + sunset * 0.04 + night * 0.03)
      + innerShade * (0.18 + night * 0.05)
      + castFromUpperBeams * (0.16 + sunset * 0.05)
      + postLowerShade * (0.22 + twilight * 0.05 + night * 0.08)
      + lowerExposedEdge * (0.16 + night * 0.04)
      + lowerBase * (0.30 + night * 0.12);

    vec3 color = tex.rgb;
    color *= 1.0 - object * structuralShadow;
    color *= 1.0 - object * (twilight * 0.090 + night * 0.22);
    color = mix(color, vec3(0.025, 0.045, 0.075), object * night * lowerBase * 0.28);

    vec3 overheadColor = mix(vec3(0.72, 0.92, 1.0), vec3(1.0, 0.48, 0.16), sunset);
    overheadColor = mix(overheadColor, vec3(0.70, 0.58, 1.0), twilight * 0.72);
    overheadColor = mix(overheadColor, vec3(0.42, 0.66, 1.0), night);
    float topSheen = overheadLight * (0.058 + sunset * 0.050 + twilight * 0.024 + night * 0.026);
    float wetTop = lowerBase * verticalLight * (0.012 + night * 0.010);
    color += object * overheadColor * (topSheen + wetTop);

    return color;
  }

  vec4 sampleToriiLocal(vec2 local) {
    float bounds = step(0.0, local.x) * step(local.x, 1.0)
      * step(0.0, local.y) * step(local.y, 1.0);
    vec4 tex = blendToriiAssets(local, bounds);
    tex.rgb = shadeToriiSprite(tex, local);
    return tex;
  }

  vec4 sampleTorii(vec2 p, float horizon, float aspect) {
    vec2 size = toriiSize(aspect);
    vec2 origin = toriiOrigin(horizon, aspect);
    vec2 local = vec2(
      (p.x - origin.x) / size.x,
      (p.y - origin.y) / size.y
    );
    vec4 tex = sampleToriiLocal(local);
    float waterline = toriiWaterlineLocal();
    float contactDamp = (1.0 - smoothstep(waterline + 0.010, waterline + 0.120, local.y))
      * smoothstep(waterline - 0.030, waterline + 0.018, local.y);
    tex.rgb = mix(tex.rgb, tex.rgb * vec3(0.46, 0.64, 0.68), contactDamp * 0.18);
    tex.a = clamp(tex.a * 1.06, 0.0, 1.0);
    return tex;
  }

  vec2 toriiPillarContactPoint(float horizon, float aspect, float localX) {
    vec2 size = toriiSize(aspect);
    vec2 origin = toriiOrigin(horizon, aspect);
    return origin + vec2(size.x * localX, size.y * toriiWaterlineLocal());
  }

  float toriiPillarWaterInfluence(vec2 p, vec2 lake, float horizon, float aspect, float localX) {
    vec2 size = toriiSize(aspect);
    vec2 contact = toriiPillarContactPoint(horizon, aspect, localX);
    vec2 contactLake = lakeCoord(contact, horizon, aspect);
    float verticalOffset = abs(contact.y - p.y);
    float axisLake = abs(contactLake.y - lake.y);
    float waterSide = smoothstep(0.002, 0.014, verticalOffset)
      * (1.0 - smoothstep(size.y * 1.55, size.y * 3.15, verticalOffset));
    float travelSide = smoothstep(0.04, 0.46, axisLake)
      * (1.0 - smoothstep(2.65, 5.40, axisLake));
    float lateral = 1.0 - smoothstep(size.x * 0.16, size.x * 0.86, abs(p.x - contact.x));
    return waterSide * travelSide * lateral * uToriiReady;
  }

  vec2 toriiContinuousWaveReflectionAt(vec2 p, vec2 lake, float horizon, float aspect, float localX, float phaseOffset) {
    vec2 contact = toriiPillarContactPoint(horizon, aspect, localX);
    vec2 contactLake = lakeCoord(contact, horizon, aspect);
    vec2 delta = (lake - contactLake) * vec2(0.88, 1.0);
    float d = length(delta);
    float mask = toriiPillarWaterInfluence(p, lake, horizon, aspect, localX) * exp(-d * 0.62);

    float incomingBeatPhase = contactLake.y * 6.4 - uTime * 2.2 + phaseOffset;
    float beatReflect = sin(d * 7.2 + incomingBeatPhase + 1.35) * uBeatEnergy;
    float flowReflect = sin(d * 13.0 + contactLake.x * 0.42 + uTime * 0.62 + phaseOffset) * 0.18;
    float reflected = beatReflect * 0.42 + flowReflect * (0.18 + uBeatEnergy * 0.12);
    return vec2(reflected, abs(reflected)) * mask;
  }

  vec2 toriiContinuousWaveReflection(vec2 p, vec2 lake, float horizon, float aspect) {
    vec2 left = toriiContinuousWaveReflectionAt(p, lake, horizon, aspect, 0.26, 0.0);
    vec2 right = toriiContinuousWaveReflectionAt(p, lake, horizon, aspect, 0.74, 1.7);
    return left + right;
  }

  vec2 toriiRippleReflectionAt(vec2 p, vec2 lake, float horizon, float aspect, vec4 source, float localX, float phaseOffset) {
    float age = uTime - source.z;
    float sourceLive = step(0.0, age) * (1.0 - smoothstep(3.7, 5.1, age));
    vec2 sourceLake = lakeCoord(source.xy, horizon, aspect);
    float sourceNear = clamp((horizon - source.y) / horizon, 0.0, 1.0);
    float sourceScale = smoothstep(0.02, 0.96, sourceNear);
    float speed = mix(0.38, 0.68, source.w);
    float ringWidth = mix(0.036, 0.104, sourceScale);

    vec2 contact = toriiPillarContactPoint(horizon, aspect, localX);
    vec2 contactLake = lakeCoord(contact, horizon, aspect);
    vec2 metric = vec2(0.88, 1.0);
    vec2 scaledLake = lake * metric;
    vec2 scaledSource = sourceLake * metric;
    vec2 scaledContact = contactLake * metric;
    vec2 virtualSource = scaledContact * 2.0 - scaledSource;

    float sourceToPillar = length(scaledContact - scaledSource);
    float front = age * speed;
    float reflectedAge = max((front - sourceToPillar) / max(speed, 0.001), 0.0);
    float contactHit = smoothstep(-ringWidth * 1.7, ringWidth * 2.2, front - sourceToPillar);
    float reflectionLive = contactHit * (1.0 - smoothstep(2.9, 4.8, reflectedAge));

    vec2 sourceDir = (scaledSource - scaledContact) / max(sourceToPillar, 0.001);
    vec2 outDelta = scaledLake - scaledContact;
    float outDistance = length(outDelta);
    vec2 outDir = outDelta / max(outDistance, 0.001);
    float reflectionLobe = pow(max(dot(outDir, sourceDir), 0.0), mix(1.15, 1.85, sourceScale));

    float reflectedDistance = length(scaledLake - virtualSource);
    float reflectedWidth = ringWidth * mix(1.18, 1.36, sourceScale);
    float phase = reflectedDistance - front;
    float envelope = exp(-abs(phase) / reflectedWidth) * exp(-age * 0.40);
    float ring = sin(phase * mix(54.0, 30.0, sourceScale) + phaseOffset);
    float sourceSeparation = smoothstep(0.035, 0.42, abs(contactLake.y - sourceLake.y));
    float sourceApproach = smoothstep(0.08, 0.72, sourceToPillar);
    float arcBreakup = mix(0.82, 1.0, noise(vec2(reflectedDistance * 1.7 + localX * 9.0, uTime * 0.12)));
    float mask = toriiPillarWaterInfluence(p, lake, horizon, aspect, localX)
      * sourceLive * reflectionLive * reflectionLobe * sourceSeparation * sourceApproach * source.w * 0.8 * arcBreakup;

    return vec2(ring * envelope, envelope) * mask;
  }

  vec2 toriiRippleReflection(vec2 p, vec2 lake, float horizon, float aspect, vec4 source) {
    vec2 left = toriiRippleReflectionAt(p, lake, horizon, aspect, source, 0.26, 0.0);
    vec2 right = toriiRippleReflectionAt(p, lake, horizon, aspect, source, 0.74, 1.7);
    return left + right;
  }

  float toriiRippleTransmissionShadowAt(vec2 lake, float horizon, float aspect, vec4 source, float localX) {
    float age = uTime - source.z;
    float sourceLive = step(0.0, age) * (1.0 - smoothstep(3.7, 5.1, age));
    vec2 sourceLake = lakeCoord(source.xy, horizon, aspect);
    float sourceNear = clamp((horizon - source.y) / horizon, 0.0, 1.0);
    float sourceScale = smoothstep(0.02, 0.96, sourceNear);
    float speed = mix(0.38, 0.68, source.w);
    float ringWidth = mix(0.036, 0.104, sourceScale);

    vec2 contact = toriiPillarContactPoint(horizon, aspect, localX);
    vec2 contactLake = lakeCoord(contact, horizon, aspect);
    vec2 metric = vec2(0.88, 1.0);
    vec2 scaledLake = lake * metric;
    vec2 scaledSource = sourceLake * metric;
    vec2 scaledContact = contactLake * metric;
    vec2 sourceToPillar = scaledContact - scaledSource;
    float sourceToPillarDistance = length(sourceToPillar);
    vec2 travelDir = sourceToPillar / max(sourceToPillarDistance, 0.001);

    float front = age * speed;
    float contactHit = smoothstep(-ringWidth * 1.5, ringWidth * 2.4, front - sourceToPillarDistance);
    vec2 beyond = scaledLake - scaledContact;
    float forward = dot(beyond, travelDir);
    float behindPillar = smoothstep(0.025, 0.20, forward)
      * (1.0 - smoothstep(3.0, 5.2, forward));
    float lateralDistance = abs(beyond.x * travelDir.y - beyond.y * travelDir.x);
    float shadowWidth = mix(0.050, 0.090, sourceScale)
      + smoothstep(0.0, 2.8, forward) * mix(0.080, 0.160, sourceScale);
    float lateral = 1.0 - smoothstep(shadowWidth, shadowWidth * 2.4, lateralDistance);
    float sourceApproach = smoothstep(0.08, 0.72, sourceToPillarDistance);
    float strength = clamp(source.w * 0.82, 0.18, 1.0);

    return sourceLive * contactHit * behindPillar * lateral * sourceApproach * strength * uToriiReady;
  }

  float toriiRippleTransmissionShadow(vec2 lake, float horizon, float aspect, vec4 source) {
    float left = toriiRippleTransmissionShadowAt(lake, horizon, aspect, source, 0.26);
    float right = toriiRippleTransmissionShadowAt(lake, horizon, aspect, source, 0.74);
    return clamp(left + right, 0.0, 1.0);
  }

  vec4 sampleToriiReflection(vec2 p, float horizon, float aspect, float wave, float farDepth) {
    vec2 size = toriiSize(aspect);
    vec2 origin = toriiOrigin(horizon, aspect);
    vec2 waterline = origin + vec2(size.x * 0.5, size.y * toriiWaterlineLocal());
    float reflectionHeight = size.y * 0.94;
    float drop = waterline.y - p.y;
    float reflectionT = clamp(drop / max(reflectionHeight, 0.001), 0.0, 1.0);
    float reflectionSampleT = pow(reflectionT, 0.78);
    float surfaceNoise = fbm(vec2(p.x * 36.0 + uTime * 0.024, p.y * 120.0 - uTime * 0.18));
    float lineRipple = sin(p.y * 780.0 + p.x * 42.0 + uTime * 1.25) * 0.5 + 0.5;
    float horizontalDrag = wave * mix(0.18, 0.58, reflectionT)
      + (surfaceNoise - 0.5) * mix(0.004, 0.020, reflectionT)
      + (lineRipple - 0.5) * mix(0.001, 0.010, reflectionT);
    vec2 local = vec2(
      (p.x + horizontalDrag - origin.x) / size.x,
      toriiWaterlineLocal() + reflectionSampleT * (1.0 - toriiWaterlineLocal())
    );
    float bounds = step(0.0, local.x) * step(local.x, 1.0)
      * step(0.0, local.y) * step(local.y, 1.0)
      * step(0.0, drop) * (1.0 - step(reflectionHeight, drop));

    float blur = mix(0.004, 0.034, reflectionT) + abs(wave) * 0.08;
    vec4 taps[5];
    taps[0] = sampleToriiLocal(local + vec2(-2.0 * blur, 0.008 * reflectionT));
    taps[1] = sampleToriiLocal(local + vec2(-0.8 * blur, -0.004 * reflectionT));
    taps[2] = sampleToriiLocal(local);
    taps[3] = sampleToriiLocal(local + vec2(0.8 * blur, 0.004 * reflectionT));
    taps[4] = sampleToriiLocal(local + vec2(2.0 * blur, -0.008 * reflectionT));

    vec4 tex = vec4(0.0);
    float weights[5];
    weights[0] = 0.12;
    weights[1] = 0.22;
    weights[2] = 0.32;
    weights[3] = 0.22;
    weights[4] = 0.12;
    float alphaSum = 0.0;
    for (int i = 0; i < 5; i++) {
      tex.rgb += taps[i].rgb * taps[i].a * weights[i];
      alphaSum += taps[i].a * weights[i];
    }
    tex.rgb /= max(alphaSum, 0.001);
    tex.a = alphaSum;

    float fade = mix(0.32, 1.0, pow(1.0 - reflectionT, 1.08));
    fade *= 1.0 - smoothstep(0.92, 1.0, reflectionT) * 0.72;
    float contactBoost = 1.0 + (1.0 - smoothstep(0.0, 0.24, reflectionT)) * 0.42;
    float waterHold = smoothstep(0.18, 0.90, farDepth);
    float surfaceBreakup = mix(0.80, 1.0, surfaceNoise) * mix(0.88, 1.0, lineRipple);
    float sunset = sunsetPhase(uSongProgress);
    float twilight = twilightPhase(uSongProgress);
    float night = nightPhase(uSongProgress);
    vec3 reflectionTint = mix(vec3(0.28, 0.45, 0.52), vec3(0.88, 0.50, 0.25), sunset * 0.42);
    reflectionTint = mix(reflectionTint, vec3(0.30, 0.24, 0.46), twilight * 0.45);
    reflectionTint = mix(reflectionTint, vec3(0.06, 0.11, 0.20), night * 0.72);
    vec3 waterTint = mix(vec3(0.72, 0.90, 0.95), reflectionTint, 0.42 + night * 0.24);
    tex.rgb = mix(tex.rgb * waterTint, reflectionTint, 0.12 + night * 0.12);
    tex.a *= bounds * fade * contactBoost * waterHold * surfaceBreakup * (0.66 + sunset * 0.08 - night * 0.065);
    return tex;
  }

  void main() {
    vec2 uv = vUv;
    float aspect = max(1.0, uResolution.x / max(uResolution.y, 1.0));
    float horizon = 0.565 + sin(uTime * 0.05) * 0.004;
    float sunset = sunsetPhase(uSongProgress);
    float twilight = twilightPhase(uSongProgress);
    float night = nightPhase(uSongProgress);
    float dayCloudVariation = (1.0 - smoothstep(0.18, 0.50, uSongProgress)) * (1.0 - night * 0.80);
    vec3 cloudColor = mix(vec3(0.98, 1.0, 0.98), vec3(1.0, 0.55, 0.27), sunset);
    cloudColor = mix(cloudColor, vec3(0.74, 0.56, 0.96), twilight * 0.74);
    cloudColor = mix(cloudColor, vec3(0.42, 0.58, 0.82), night);

    vec3 skyTop = mix(vec3(0.34, 0.73, 0.94), vec3(0.02, 0.08, 0.18), night);
    vec3 skyLow = mix(vec3(0.90, 0.98, 1.0), vec3(0.19, 0.16, 0.30), twilight + night * 0.55);
    skyLow = mix(skyLow, vec3(1.0, 0.63, 0.34), sunset * 0.62);
    vec3 sky = mix(skyLow, skyTop, smoothstep(horizon, 1.0, uv.y));
    vec3 photo = sampleBackdrop(uv);

    float sun = exp(-distance(vec2((uv.x - 0.78) * aspect, uv.y - 0.82), vec2(0.0)) * 12.0);
    sky += vec3(1.0, 0.68, 0.22) * sun * (0.34 + sunset * 0.30) * (1.0 - night);

    float cloud = fbm(vec2(uv.x * 4.2 + uTime * 0.012, uv.y * 7.0));
    float cloudMask = smoothstep(0.62, 0.94, cloud) * smoothstep(0.62, 0.95, uv.y);
    sky = mix(sky, vec3(0.97, 1.0, 1.0), cloudMask * 0.28);

    float mountainLine = horizon + 0.052
      + sin(uv.x * 8.0) * 0.026
      + sin(uv.x * 18.0 + 1.6) * 0.015
      + fbm(vec2(uv.x * 6.0, 2.0)) * 0.03;
    float mountainMask = step(horizon, uv.y) * (1.0 - step(mountainLine, uv.y));
    mountainMask *= smoothstep(horizon, horizon + 0.018, uv.y);
    vec3 mountain = mix(vec3(0.20, 0.48, 0.54), vec3(0.56, 0.78, 0.76), uv.y);
    sky = mix(sky, mountain, mountainMask * 0.72);
    sky = mix(sky, photo, uBackdropReady * step(horizon, uv.y));

    vec2 highCloudUv = vec2(
      uv.x * 0.72 + uTime * 0.0022,
      uv.y * 0.90 + sin(uTime * 0.026) * 0.006
    );
    vec2 highCloudUvSlow = vec2(
      uv.x * 0.92 - uTime * 0.0011 + 0.38,
      uv.y * 1.05 + 0.08 + sin(uTime * 0.019) * 0.004
    );
    vec2 horizonCloudUv = vec2(
      uv.x * 0.96 + uTime * 0.0007 + 0.14,
      uv.y * 1.07 - 0.02 + sin(uTime * 0.018) * 0.002
    );
    vec2 highCloudUvWide = vec2(
      uv.x * 0.48 - uTime * 0.0006 + 0.62,
      uv.y * 0.72 + 0.16 + sin(uTime * 0.015) * 0.004
    );
    vec2 highCloudUvFine = vec2(
      uv.x * 1.28 + uTime * 0.0017 + 0.21,
      uv.y * 1.22 - 0.05 + sin(uTime * 0.022) * 0.003
    );
    vec2 horizonCloudUvDrift = vec2(
      uv.x * 0.82 - uTime * 0.0005 + 0.55,
      uv.y * 0.96 + 0.03 + sin(uTime * 0.012) * 0.002
    );
    float highCloud = sampleHighCloudMask(highCloudUv) * smoothstep(horizon + 0.09, 0.94, uv.y);
    float highCloudSlow = sampleHighCloudMask(highCloudUvSlow) * smoothstep(horizon + 0.14, 0.98, uv.y);
    float horizonCloud = sampleHorizonCloudMask(horizonCloudUv)
      * smoothstep(horizon + 0.008, horizon + 0.040, uv.y)
      * (1.0 - smoothstep(horizon + 0.22, horizon + 0.40, uv.y));
    float highCloudWide = sampleHighCloudMask(highCloudUvWide)
      * smoothstep(horizon + 0.15, 0.96, uv.y)
      * (1.0 - smoothstep(0.92, 1.0, uv.y));
    float highCloudFine = sampleHighCloudMask(highCloudUvFine)
      * smoothstep(horizon + 0.08, 0.88, uv.y)
      * (1.0 - smoothstep(0.86, 0.98, uv.y));
    float horizonCloudDrift = sampleHorizonCloudMask(horizonCloudUvDrift)
      * smoothstep(horizon + 0.020, horizon + 0.070, uv.y)
      * (1.0 - smoothstep(horizon + 0.16, horizon + 0.34, uv.y));
    float cloudAlpha = clamp(
      highCloud * 0.16 + highCloudSlow * 0.08 + horizonCloud * 0.18,
      0.0,
      0.34
    ) * uCloudReady;
    cloudAlpha *= 1.0 - night * 0.42;
    sky = mix(sky, cloudColor, cloudAlpha * step(horizon, uv.y));
    float dayCloudAlpha = clamp(
      highCloudWide * 0.115 + highCloudFine * 0.060 + horizonCloudDrift * 0.110,
      0.0,
      0.24
    ) * dayCloudVariation * uCloudReady;
    vec3 dayCloudColor = mix(vec3(0.88, 0.96, 1.0), cloudColor, 0.34 + sunset * 0.20);
    sky = mix(sky, dayCloudColor, dayCloudAlpha * step(horizon, uv.y));

    float horizonBlend = smoothstep(horizon - 0.003, horizon + 0.008, uv.y);
    float waterMask = 1.0 - horizonBlend;
    float farDepth = clamp(uv.y / horizon, 0.0, 1.0);
    float nearDepth = clamp((horizon - uv.y) / horizon, 0.0, 1.0);
    float nearCurve = pow(nearDepth, 0.72);
    vec2 lake = lakeCoord(uv, horizon, aspect);
    float waveFine = sin(lake.x * 18.0 + lake.y * 10.5 - uTime * 1.4);
    float waveWide = sin(lake.x * 4.2 - lake.y * 2.7 + uTime * 0.52);
    float waveNoise = fbm(vec2(lake.x * 1.8 + uTime * 0.05, lake.y * 1.6 - uTime * 0.03));
    float wave = waveFine * mix(0.004, 0.020, nearCurve)
      + waveWide * mix(0.006, 0.024, nearCurve)
      + (waveNoise - 0.5) * mix(0.016, 0.052, nearCurve);

    float ripple = 0.0;
    float rippleGlow = 0.0;
    for (int i = 0; i < ${MAX_RIPPLES}; i++) {
      vec4 source = uRipples[i];
      float age = uTime - source.z;
      float live = step(0.0, age) * (1.0 - smoothstep(3.7, 5.1, age));
      vec2 sourceLake = lakeCoord(source.xy, horizon, aspect);
      float sourceNear = clamp((horizon - source.y) / horizon, 0.0, 1.0);
      float sourceScale = smoothstep(0.02, 0.96, sourceNear);
      vec2 delta = lake - sourceLake;
      float d = length(delta);
      float front = age * mix(0.38, 0.68, source.w);
      float ringWidth = mix(0.030, 0.094, sourceScale);
      float envelope = exp(-abs(d - front) / ringWidth) * exp(-age * 0.36);
      float ring = sin((d - front) * mix(62.0, 34.0, sourceScale));
      float distanceFade = mix(0.28, 1.0, sourceScale);
      float transmission = 1.0 - toriiRippleTransmissionShadow(lake, horizon, aspect, source) * 0.14;
      ripple += ring * envelope * live * source.w * distanceFade * transmission;
      rippleGlow += envelope * live * source.w * distanceFade * transmission;
      vec2 reflectedRipple = toriiRippleReflection(uv, lake, horizon, aspect, source);
      ripple += reflectedRipple.x;
      rippleGlow += reflectedRipple.y * 0.72;
    }

    float beatWave = sin(lake.y * 6.4 - uTime * 2.2) * uBeatEnergy * mix(0.36, 0.92, nearCurve);
    vec2 toriiWaveReflection = toriiContinuousWaveReflection(uv, lake, horizon, aspect);
    wave += toriiWaveReflection.x * mix(0.006, 0.017, nearCurve);
    float perspectiveLine = smoothstep(0.965, 1.0, sin(lake.y * 11.0 + waveNoise * 2.0) * 0.5 + 0.5);
    float sparkleSeed = noise(vec2(lake.x * 26.0 + uTime * 0.7, lake.y * 18.0));
    float sparkle = smoothstep(0.985, 1.0, sparkleSeed + wave * 0.8) * smoothstep(0.18, 0.9, farDepth);

    vec3 shallow = vec3(0.10, 0.38, 0.52);
    vec3 deep = vec3(0.01, 0.09, 0.17);
    vec3 water = mix(deep, shallow, farDepth);
    vec2 reflectionUv = vec2(
      uv.x + wave * 0.10,
      horizon + (horizon - uv.y) * 0.54 + sin(lake.x * 0.55 + uTime * 0.08) * 0.006
    );
    vec3 reflection = sampleBackdrop(reflectionUv);
    float shorelineAvoid = smoothstep(horizon - 0.075, horizon - 0.003, uv.y);
    vec3 photoWater = sampleBackdrop(vec2(uv.x + wave * 0.04, uv.y - shorelineAvoid * 0.075));
    float reflectionMix = smoothstep(0.02, 0.82, farDepth) * uBackdropReady;
    vec3 photoBase = mix(photoWater, reflection, reflectionMix * 0.24);
    float photoDominance = uBackdropReady * mix(0.66, 0.92, smoothstep(0.0, 1.0, farDepth));
    water = mix(water, photoBase, photoDominance);
    water = mix(water, reflection, reflectionMix * 0.16);
    water += vec3(0.08, 0.24, 0.32) * wave;
    water += sky * (0.028 + farDepth * mix(0.045, 0.020, night));
    vec2 reflectedHighCloudUv = vec2(
      uv.x * 0.72 + uTime * 0.0022 + wave * 0.80,
      (horizon + (horizon - uv.y) * 0.62) * 0.90 + sin(uTime * 0.026) * 0.006
    );
    vec2 reflectedHorizonCloudUv = vec2(
      uv.x * 0.96 + uTime * 0.0007 + wave * 0.42 + 0.14,
      (horizon + (horizon - uv.y) * 0.30) * 1.07 - 0.02
    );
    float reflectedCloud = sampleHighCloudMask(reflectedHighCloudUv) * 0.10
      + sampleHorizonCloudMask(reflectedHorizonCloudUv) * 0.16;
    vec2 reflectedHighCloudWideUv = vec2(
      uv.x * 0.48 - uTime * 0.0006 + wave * 0.62 + 0.62,
      (horizon + (horizon - uv.y) * 0.58) * 0.72 + 0.16 + sin(uTime * 0.015) * 0.004
    );
    vec2 reflectedHorizonCloudDriftUv = vec2(
      uv.x * 0.82 - uTime * 0.0005 + wave * 0.40 + 0.55,
      (horizon + (horizon - uv.y) * 0.32) * 0.96 + 0.03 + sin(uTime * 0.012) * 0.002
    );
    reflectedCloud += dayCloudVariation * (
      sampleHighCloudMask(reflectedHighCloudWideUv) * 0.070
      + sampleHorizonCloudMask(reflectedHorizonCloudDriftUv) * 0.085
    );
    reflectedCloud *= smoothstep(0.18, 0.94, farDepth) * (1.0 - night * 0.24) * uCloudReady;
    water = mix(water, cloudColor, reflectedCloud * (0.06 + sunset * 0.035 + twilight * 0.020));
    water += vec3(0.64, 1.0, 0.98) * perspectiveLine * mix(0.010, 0.050, nearCurve);
    water += vec3(0.48, 0.94, 1.0) * toriiWaveReflection.y * (0.030 + uBeatEnergy * 0.060);
    water += vec3(0.42, 0.95, 1.0) * abs(ripple) * (0.24 + uAmplitude * 0.72);
    water += vec3(1.0, 0.88, 0.35) * rippleGlow * (0.10 + uChorus * 0.24);
    water += vec3(0.50, 0.94, 1.0) * beatWave * 0.070;
    water += mix(vec3(1.0, 0.93, 0.45), vec3(0.55, 0.82, 1.0), night) * sparkle * (0.10 + uChorus * 0.12 + night * 0.10);
    float shorelineLock = smoothstep(horizon - 0.050, horizon - 0.008, uv.y) * uBackdropReady;
    water = mix(water, photoWater, shorelineLock * 0.32);
    vec4 toriiReflection = sampleToriiReflection(uv, horizon, aspect, wave, farDepth);
    water = mix(water, toriiReflection.rgb, toriiReflection.a);

    vec3 color = mix(sky, water, waterMask);
    vec4 torii = sampleTorii(uv, horizon, aspect);
    vec3 toriiColor = torii.rgb;
    vec3 horizonHaze = sampleBackdrop(vec2(uv.x, horizon + 0.028));
    float toriiLuma = dot(toriiColor, vec3(0.2126, 0.7152, 0.0722));
    float toriiAtmosphere = clamp(sunset + twilight * 0.50, 0.0, 1.0);
    toriiColor = mix(vec3(toriiLuma), toriiColor, mix(0.82, 0.76, toriiAtmosphere));
    vec3 toriiMid = mix(vec3(0.26, 0.32, 0.34), horizonHaze, 0.45);
    toriiColor = mix(toriiMid, toriiColor, 0.88 - night * 0.05);
    toriiColor = mix(toriiColor, horizonHaze, 0.060 + sunset * 0.015 + twilight * 0.025 + night * 0.060);
    color = mix(color, toriiColor, torii.a);
    float horizonLine = exp(-abs(uv.y - horizon) * 95.0);
    float shoreBreakup = mix(0.72, 1.0, fbm(vec2(uv.x * 18.0, 3.0)));
    color = mix(color, photo, uBackdropReady * horizonLine * 0.02);
    color *= 1.0 - horizonLine * shoreBreakup * uBackdropReady * 0.10;

    float vignette = smoothstep(0.92, 0.24, distance(uv, vec2(0.5, 0.48)));
    color *= mix(0.72, 1.06, vignette);
    gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
  }
`;

export function createLakeScene(container) {
  return new LakeScene(container);
}

class LakeScene {
  constructor(container) {
    this.container = container;
    this.startedAt = performance.now();
    this.rippleIndex = 0;
    this.pointerRippleAt = 0;
    this.nextAmbientAt = 0.6;
    this.ambientRipplesEnabled = true;
    this.targetAmplitude = 0;
    this.targetChorus = 0;
    this.beatEnergy = 0;
    this.targetBeatEnergy = 0;
    this.assetTotal = BACKDROP_TEXTURES.length + CLOUD_TEXTURES.length + TORII_TEXTURES.length;
    this.assetLoaded = 0;
    this.assetReady = false;
    this.assetProgressListeners = new Set();
    this.assetsReadyPromise = new Promise((resolve) => {
      this.resolveAssetsReady = resolve;
    });
    const fallbackPixel = new Uint8Array([120, 215, 229, 255]);
    const fallbackTexture = new THREE.DataTexture(fallbackPixel, 1, 1);
    fallbackTexture.needsUpdate = true;
    const fallbackMaskPixel = new Uint8Array([0, 0, 0, 255]);
    const fallbackMaskTexture = new THREE.DataTexture(fallbackMaskPixel, 1, 1);
    fallbackMaskTexture.needsUpdate = true;
    const fallbackTransparentPixel = new Uint8Array([0, 0, 0, 0]);
    const fallbackTransparentTexture = new THREE.DataTexture(fallbackTransparentPixel, 1, 1);
    fallbackTransparentTexture.needsUpdate = true;

    this.uniforms = {
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uBackdrop: { value: fallbackTexture },
      uBackdropSunset: { value: fallbackTexture },
      uBackdropTwilight: { value: fallbackTexture },
      uBackdropNight: { value: fallbackTexture },
      uBackdropReady: { value: 0 },
      uCloudHigh: { value: fallbackMaskTexture },
      uCloudHorizon: { value: fallbackMaskTexture },
      uCloudReady: { value: 0 },
      uToriiDay: { value: fallbackTransparentTexture },
      uToriiSunset: { value: fallbackTransparentTexture },
      uToriiTwilight: { value: fallbackTransparentTexture },
      uToriiNight: { value: fallbackTransparentTexture },
      uToriiReady: { value: 0 },
      uSongProgress: { value: 0 },
      uRipples: {
        value: Array.from({ length: MAX_RIPPLES }, () => new THREE.Vector4(-10, -10, -10, 0)),
      },
      uAmplitude: { value: 0 },
      uBeatEnergy: { value: 0 },
      uChorus: { value: 0 },
    };

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.setClearColor(0x06141c, 1);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader,
      fragmentShader,
      depthTest: false,
      depthWrite: false,
    });

    this.scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material));

    this.resize = this.resize.bind(this);
    this.animate = this.animate.bind(this);
    this.handlePointer = this.handlePointer.bind(this);

    window.addEventListener("resize", this.resize);
    container.addEventListener("pointerdown", this.handlePointer);
    container.addEventListener("pointermove", this.handlePointer);

    this.resize();
    this.loadBackdrop();
    this.loadCloudLayers();
    this.loadToriiLayer();
    this.animate();
  }

  loadBackdrop() {
    const loader = new THREE.TextureLoader();
    let loaded = 0;

    for (const [uniformName, path] of BACKDROP_TEXTURES) {
      loader.load(path, (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        this.uniforms[uniformName].value = texture;
        loaded += 1;
        this.uniforms.uBackdropReady.value = loaded === BACKDROP_TEXTURES.length
          ? 1
          : loaded / BACKDROP_TEXTURES.length;
        this.markAssetLoaded();
      }, undefined, () => {
        this.markAssetLoaded();
      });
    }
  }

  loadCloudLayers() {
    const loader = new THREE.TextureLoader();
    let loaded = 0;

    for (const [uniformName, path] of CLOUD_TEXTURES) {
      loader.load(path, (texture) => {
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        this.uniforms[uniformName].value = texture;
        loaded += 1;
        this.uniforms.uCloudReady.value = loaded === CLOUD_TEXTURES.length
          ? 1
          : loaded / CLOUD_TEXTURES.length;
        this.markAssetLoaded();
      }, undefined, () => {
        this.markAssetLoaded();
      });
    }
  }

  loadToriiLayer() {
    const loader = new THREE.TextureLoader();
    let loaded = 0;

    for (const [uniformName, path] of TORII_TEXTURES) {
      loader.load(path, (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        this.uniforms[uniformName].value = texture;
        loaded += 1;
        this.uniforms.uToriiReady.value = loaded === TORII_TEXTURES.length ? 1 : 0;
        this.markAssetLoaded();
      }, undefined, () => {
        this.markAssetLoaded();
      });
    }
  }

  markAssetLoaded() {
    if (this.assetLoaded >= this.assetTotal) return;
    this.assetLoaded += 1;
    if (this.assetLoaded >= this.assetTotal) {
      this.assetLoaded = this.assetTotal;
      this.assetReady = true;
    }

    const state = this.getAssetLoadingState();
    this.assetProgressListeners.forEach((listener) => listener(state));
    if (state.ready) this.resolveAssetsReady(state);
  }

  getAssetLoadingState() {
    const total = Math.max(this.assetTotal, 1);
    return {
      loaded: this.assetLoaded,
      total: this.assetTotal,
      progress: THREE.MathUtils.clamp(this.assetLoaded / total, 0, 1),
      ready: this.assetReady,
    };
  }

  onAssetProgress(listener) {
    if (typeof listener !== "function") return () => {};
    this.assetProgressListeners.add(listener);
    listener(this.getAssetLoadingState());
    return () => {
      this.assetProgressListeners.delete(listener);
    };
  }

  whenAssetsReady() {
    return this.assetsReadyPromise;
  }

  setAudioState({ amplitude = 0, chorus = false } = {}) {
    this.targetAmplitude = THREE.MathUtils.clamp(amplitude, 0, 1);
    this.targetChorus = chorus ? 1 : 0;
  }

  setSongProgress(progress = 0) {
    this.uniforms.uSongProgress.value = THREE.MathUtils.clamp(progress, 0, 1);
  }

  setAmbientRipplesEnabled(enabled = true) {
    this.ambientRipplesEnabled = Boolean(enabled);
  }

  pulseBeat(strength = 0.45) {
    this.targetBeatEnergy = Math.min(1, this.targetBeatEnergy + strength * 0.72);
  }

  addRipple(x, y, strength = 0.7) {
    const safeX = THREE.MathUtils.clamp(x, 0.04, 0.96);
    const safeY = THREE.MathUtils.clamp(y, 0.08, 0.535);
    const safeStrength = THREE.MathUtils.clamp(strength, 0.08, 1.4);
    this.uniforms.uRipples.value[this.rippleIndex].set(
      safeX,
      safeY,
      this.uniforms.uTime.value,
      safeStrength,
    );
    this.rippleIndex = (this.rippleIndex + 1) % MAX_RIPPLES;
  }

  handlePointer(event) {
    if (event.type === "pointermove" && event.buttons !== 1) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    const x = (event.clientX - rect.left) / Math.max(rect.width, 1);
    const screenY = (event.clientY - rect.top) / Math.max(rect.height, 1);
    const y = 1 - screenY;
    if (x < 0 || x > 1 || screenY < 0 || screenY > 1 || y > POINTER_WATER_MAX_Y) return;

    const now = performance.now();
    if (event.type === "pointermove" && now - this.pointerRippleAt < 90) return;
    this.pointerRippleAt = now;

    this.addRipple(x, y, event.type === "pointerdown" ? 1.0 : 0.62);
  }

  resize() {
    const { clientWidth, clientHeight } = this.container;
    this.renderer.setSize(clientWidth, clientHeight, false);
    this.uniforms.uResolution.value.set(clientWidth, clientHeight);
  }

  animate() {
    const elapsed = (performance.now() - this.startedAt) / 1000;
    this.uniforms.uTime.value = elapsed;
    this.uniforms.uAmplitude.value += (this.targetAmplitude - this.uniforms.uAmplitude.value) * 0.08;
    this.uniforms.uChorus.value += (this.targetChorus - this.uniforms.uChorus.value) * 0.08;
    this.targetBeatEnergy *= 0.965;
    this.beatEnergy += (this.targetBeatEnergy - this.beatEnergy) * 0.082;
    this.uniforms.uBeatEnergy.value = this.beatEnergy;

    if (!this.ambientRipplesEnabled) {
      this.nextAmbientAt = elapsed + 0.8;
    } else if (elapsed >= this.nextAmbientAt) {
      const depth = 0.07 + Math.pow(Math.random(), 0.9) * 0.48;
      const y = 0.535 * (1 - depth);
      this.addRipple(0.12 + Math.random() * 0.76, y, 0.18 + Math.random() * 0.24);
      this.nextAmbientAt = elapsed + 1.1 + Math.random() * 1.4;
    }

    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this.animate);
  }
}
