# Daejeon Station experience

Open `/?station=1`, or use the station experience action in the desktop map / mobile map settings.

The station facade is a photo-informed interpretation: shallow silver roof, blue glazing, orange beam, recessed doors and facade joints. Reference: https://inmun360.culture.go.kr/content/657.do?cid=2370939&mode=view (2019). It is not a measured reconstruction or evidence of current facility operation.

The separate forecourt scene demonstrates a plaza, flower clock, crossing, shelter, trees and railway office towers. Its layout and route are illustrative, not surveyed coordinates or verified accessible navigation. The interface displays this limitation. Existing map station geometry and traveler animation are also updated.

Walking uses articulated legs with ground contact; wheelchair wheels rotate by distance. Heading eases at corners. The demonstration crossing includes a four-second wait. Playback supports walking/wheelchair, speed, seeking and camera following.

Mobile defaults to reduced detail. Station models have high/low variants; geometry is merged by material; distant views reduce foliage and character detail; pixel ratio and shadow resolution are bounded. Trees retain fixed positions. Idle rendering is throttled.

Verification: TypeScript check; route boundary, waiting, monotonicity and precise foot/tire ground-contact assertions (`node scripts/verify-station-experience.mjs`); offline geometry render; desktop and 390×844 browser layout inspection. The verification browser has WebGL disabled, so live browser 3D rendering and physical-phone FPS remain unverified. Offline rendering does not substitute for those checks.
