import type { AddendumReading, Reading } from "@/lib/reading";
import boilerAddendum1 from "./readings/boiler-addendum-1.json";
import boiler from "./readings/boiler.json";
import centralPlant from "./readings/central-plant.json";
import chillerAddendum1 from "./readings/chiller-addendum-1.json";
import chiller from "./readings/chiller.json";
import clinicControls from "./readings/clinic-controls.json";
import heatExchanger from "./readings/heat-exchanger.json";
import hvacMaint from "./readings/hvac-maint.json";
import kitchenHoods from "./readings/kitchen-hoods.json";
import rangerBoilers from "./readings/ranger-boilers.json";
import redMesa from "./readings/red-mesa.json";
import restrooms from "./readings/restrooms.json";
import roof from "./readings/roof.json";
import rtu from "./readings/rtu.json";
import unitHeaters from "./readings/unit-heaters.json";
import waterHeaters from "./readings/water-heaters.json";

/**
 * What the AI read from each solicitation, recorded ahead of time and replayed.
 * The files are saved as the model wrote them. A test checks their shape and
 * that every section and quote they cite is really in the document.
 */
export const READINGS = {
  boiler,
  "central-plant": centralPlant,
  chiller,
  "clinic-controls": clinicControls,
  "heat-exchanger": heatExchanger,
  "hvac-maint": hvacMaint,
  "kitchen-hoods": kitchenHoods,
  "ranger-boilers": rangerBoilers,
  "red-mesa": redMesa,
  restrooms,
  roof,
  rtu,
  "unit-heaters": unitHeaters,
  "water-heaters": waterHeaters,
} as unknown as Record<string, Reading>;

export const ADDENDUM_READINGS = {
  "boiler-addendum-1": boilerAddendum1,
  "chiller-addendum-1": chillerAddendum1,
} as unknown as Record<string, AddendumReading>;
