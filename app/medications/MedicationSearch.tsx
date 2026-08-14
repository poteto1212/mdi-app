"use client";
import { useMemo, useState } from "react";

type Medication = {
  [key: string]: string | number | null | undefined;
};
