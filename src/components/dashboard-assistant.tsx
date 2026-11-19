'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Sparkles, Bot, User, Loader2 } from 'lucide-react';
import { dashboardAssistant } from '@/ai/flows/dashboard-assistant-flow';
import { ScrollArea } from './ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import Markdown from 'react-markdown';


interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function DashboardAssistant() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await dashboardAssistant(input);
      const assistantMessage: Message = { role: 'assistant', content: response };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error calling AI assistant:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Lo siento, he encontrado un problema al procesar tu solicitud. Por favor, intenta de nuevo.',
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Card className="col-span-4 lg:col-span-3 flex flex-col h-full">
      <CardHeader>
        <div className="flex items-center gap-3">
            <Sparkles className="h-6 w-6 text-primary" />
            <div>
                <CardTitle className="font-headline">Asistente de IA</CardTitle>
                <CardDescription>Haz una pregunta sobre tu negocio.</CardDescription>
            </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col flex-grow min-h-0">
        <ScrollArea className="flex-grow pr-4 -mr-4 mb-4 h-[300px]">
            <div className="space-y-4">
                 {messages.length === 0 && (
                    <div className="text-center text-muted-foreground text-sm p-4">
                        <p>Ejemplos de preguntas:</p>
                        <ul className="list-disc list-inside mt-2">
                            <li>¿Cuál fue mi ingreso total hoy?</li>
                            <li>¿Quiénes son mis clientes con saldo pendiente?</li>
                            <li>¿Qué productos tienen poco stock?</li>
                        </ul>
                    </div>
                )}
                {messages.map((message, index) => (
                    <div key={index} className={`flex items-start gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}>
                        {message.role === 'assistant' && (
                            <Avatar className="h-8 w-8">
                                <AvatarFallback className="bg-primary text-primary-foreground"><Bot className="h-5 w-5"/></AvatarFallback>
                            </Avatar>
                        )}
                        <div className={`p-3 rounded-lg max-w-sm ${message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                           <article className="prose prose-sm dark:prose-invert max-w-none">
                             <Markdown>{message.content}</Markdown>
                           </article>
                        </div>
                        {message.role === 'user' && (
                            <Avatar className="h-8 w-8">
                                <AvatarFallback><User className="h-5 w-5"/></AvatarFallback>
                            </Avatar>
                        )}
                    </div>
                ))}
                 {isLoading && (
                    <div className="flex items-start gap-3">
                         <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-primary text-primary-foreground"><Bot className="h-5 w-5"/></AvatarFallback>
                        </Avatar>
                         <div className="p-3 rounded-lg bg-muted flex items-center justify-center">
                            <Loader2 className="h-5 w-5 animate-spin" />
                        </div>
                    </div>
                 )}
            </div>
        </ScrollArea>
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ej: ¿Cuál fue mi producto más vendido este mes?"
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading}>
            Enviar
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
