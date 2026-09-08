"use client";

import { useProperty } from "../hooks/use-property";
import { PropertyForm } from "./property-form";
import { PropertyLoadError } from "./property-load-error";

export function PropertyEditLoader({ propertyId }: { propertyId: number }) {
  const { state, retry } = useProperty(propertyId);
  if (state.status === "loading") {
    return <p className="text-slate-500">매물 정보를 불러오는 중입니다.</p>;
  }
  if (state.status === "error") {
    return <PropertyLoadError kind={state.kind} onRetry={retry} />;
  }
  return <PropertyForm mode="edit" propertyId={propertyId} initialValues={state.property} />;
}
