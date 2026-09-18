# Map readability update

The actual city map now uses a zoom-compensated traveler marker (nominal 72/84 CSS pixels on mobile/desktop before pitch and perspective). It is deliberately not life-size. World scale is bounded from 4 to 75; walking and wheel rotation are divided by that scale so enlarging the marker does not produce frantic motion. The station experience uses 3.2× scale. A ground halo and forward pointer communicate location and heading.

Street scenery uses fixed, continuously sampled mapped road geometry, including short segments, with building/road clearance checks. It is decorative and is not a surveyed tree inventory. The previous blanket exclusion near the station is removed; actual footprint collision checks remain. No fabricated building footprints or accessibility records are added.

OSM forecourt context is extracted separately from complete decoded objects in the existing country snapshot. Coverage completeness is stored in the output. These polygons represent mapped plazas, gardens and parking; they are independent of route accessibility. Areas missing buildings in the underlying 18,032-building snapshot still need another verified footprint source.

Validation: TypeScript, character ground contact and motion, facade floor coverage, street placement stability on zoom and cleanup checks. Browser WebGL and physical mobile performance are not verified in this environment.
