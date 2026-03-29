"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CreatePatientForm } from "./create-patient-form";

export function PatientsHeader({ count }: { count: number }) {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold">Patients</h1>
        <p className="text-muted-foreground">
          {count} patient{count !== 1 ? "s" : ""}
        </p>
      </div>
      <Button onClick={() => setShowForm(true)}>+ Nouveau patient</Button>
      {showForm && <CreatePatientForm onClose={() => setShowForm(false)} />}
    </div>
  );
}
