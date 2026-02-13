'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUserContext } from '@/components/providers/user-provider';
import { ArrowLeft, Mail, Send, Save, Eye, Code, FileText } from 'lucide-react';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  description: string;
}

const emailTemplates: EmailTemplate[] = [
  {
    id: 'welcome',
    name: 'Bienvenue',
    subject: 'Bienvenue sur Fleet Master',
    description: 'Email envoyé lors de la création d&apos;un compte',
  },
  {
    id: 'password_reset',
    name: 'Réinitialisation mot de passe',
    subject: 'Réinitialisez votre mot de passe',
    description: 'Email de réinitialisation de mot de passe',
  },
  {
    id: 'maintenance_alert',
    name: 'Alerte maintenance',
    subject: 'Maintenance requise',
    description: 'Notification de maintenance programmée',
  },
  {
    id: 'document_expiring',
    name: 'Document expirant',
    subject: 'Document bientôt expiré',
    description: 'Alerte avant expiration d&apos;un document',
  },
];

export default function EmailsPage() {
  const { user } = useUserContext();
  const [selectedTemplate, setSelectedTemplate] = useState<string>(emailTemplates[0].id);
  const [emailSettings, setEmailSettings] = useState({
    senderName: 'Transport Stéphane',
    senderEmail: 'noreply@fleetmaster.com',
    replyTo: 'gebus.stephane@gmail.com',
  });

  const currentTemplate = emailTemplates.find(t => t.id === selectedTemplate);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/settings">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Emails</h1>
          <p className="text-muted-foreground">Configuration et modèles d&apos;emails</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Configuration générale
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Nom de l&apos;expéditeur</Label>
            <Input
              value={emailSettings.senderName}
              onChange={(e) => setEmailSettings({ ...emailSettings, senderName: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Email d&apos;expédition</Label>
            <Input
              value={emailSettings.senderEmail}
              onChange={(e) => setEmailSettings({ ...emailSettings, senderEmail: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Répondre à</Label>
            <Input
              value={emailSettings.replyTo}
              onChange={(e) => setEmailSettings({ ...emailSettings, replyTo: e.target.value })}
            />
          </div>
          <Button className="w-full">
            <Save className="h-4 w-4 mr-2" />
            Enregistrer
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Modèles d&apos;emails
          </CardTitle>
          <CardDescription>Personnalisez les emails automatiques</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedTemplate} onValueChange={setSelectedTemplate}>
            <TabsList className="grid grid-cols-2 lg:grid-cols-4 mb-6">
              {emailTemplates.map(template => (
                <TabsTrigger key={template.id} value={template.id} className="text-xs">
                  {template.name}
                </TabsTrigger>
              ))}
            </TabsList>

            {emailTemplates.map(template => (
              <TabsContent key={template.id} value={template.id} className="space-y-4">
                <div className="space-y-2">
                  <Label>Objet</Label>
                  <Input defaultValue={template.subject} />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Contenu</Label>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4 mr-1" />
                        Aperçu
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Code className="h-4 w-4 mr-1" />
                        HTML
                      </Button>
                    </div>
                  </div>
                  <textarea
                    className="w-full h-48 p-3 rounded-md border border-input bg-background text-sm"
                    defaultValue={`Bonjour {prenom},\n\n${template.description}\n\nCordialement,\nL&apos;équipe Fleet Master`}
                  />
                </div>
                <div className="flex gap-2">
                  <Button className="flex-1">
                    <Save className="h-4 w-4 mr-2" />
                    Enregistrer
                  </Button>
                  <Button variant="outline">
                    <Send className="h-4 w-4 mr-2" />
                    Test
                  </Button>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
