"use client";

import { BookOpen, Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const documents = [
  {
    title: "Guide Exploitant",
    description: "Guide complet pour les gestionnaires de flotte : tableau de bord, maintenance, conformite, rapports.",
    href: "/docs/Guide%20Exploitant%20%E2%80%94%20FleetMaster.pdf",
  },
  {
    title: "Guide Chauffeur",
    description: "Guide terrain pour les chauffeurs : installation PWA, inspection, carburant, incidents, SOS.",
    href: "/docs/Guide%20Chauffeur%20%E2%80%94%20FleetMaster.pdf",
  },
];

export default function DocsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Documentation</h1>
        <p className="text-muted-foreground">
          Guides PDF a telecharger et partager avec votre equipe.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {documents.map((doc) => (
          <Card key={doc.title} className="flex flex-col">
            <CardContent className="flex flex-1 flex-col gap-4 p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold">{doc.title}</h2>
                  <p className="text-sm text-muted-foreground">{doc.description}</p>
                </div>
              </div>
              <div className="mt-auto pt-2">
                <a href={doc.href} download>
                  <Button variant="outline" className="w-full gap-2">
                    <Download className="h-4 w-4" />
                    Telecharger le PDF
                  </Button>
                </a>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
