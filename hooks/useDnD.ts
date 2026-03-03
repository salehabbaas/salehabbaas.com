"use client";

import { PointerSensor, useSensor, useSensors } from "@dnd-kit/core";

export function useBoardDnDSensors() {
  return useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6
      }
    })
  );
}
