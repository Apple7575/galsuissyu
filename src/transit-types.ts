import type {Coordinate} from './city-data';
export type TransitLeg={mode:'walk'|'bus'|'subway';minutes:number|null;distance:number|null;start:string|null;end:string|null;line:string;direction:string|null;stops:number|null;from:Coordinate|null;to:Coordinate|null;accessibility:'unknown'};
export type TransitRoute={id:string;minutes:number|null;walkDistance:number|null;fare:number|null;mapObj:string|null;legs:TransitLeg[]};
export type TransitGeometryProperties={mode:'bus'|'subway';order:number;section:number};
export type TransitGeometry=GeoJSON.FeatureCollection<GeoJSON.LineString,TransitGeometryProperties>;
export type TransitSimulationSegment={id:string;mode:'walk'|'bus'|'subway';line:string;start:string|null;end:string|null;minutes:number;coordinates:Coordinate[];startProgress:number;endProgress:number};
export type TransitSimulation={route:TransitRoute;segments:TransitSimulationSegment[];coordinates:Coordinate[];totalMinutes:number};
export type TransitPhase='walk'|'boarding'|'riding'|'alighting'|'arrived';
export type TransitSimulationPoint={coordinate:Coordinate;heading:number;segment:TransitSimulationSegment;segmentProgress:number;pathProgress:number;phase:TransitPhase;phaseProgress:number};
