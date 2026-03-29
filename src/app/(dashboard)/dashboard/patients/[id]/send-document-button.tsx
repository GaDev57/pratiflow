"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SendDocumentModal } from "./send-document-modal";

interface Props {
  practitionerId: string;
  patientId: string;
}

export function SendDocumentButton({ practitionerId, patientId }: Props) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setShowModal(true)}>
        Envoyer un document
      </Button>
      {showModal && (
        <SendDocumentModal
          practitionerId={practitionerId}
          patientId={patientId}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
