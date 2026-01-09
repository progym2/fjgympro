import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SendPdfEmailRequest {
  recipientEmail: string;
  recipientName: string;
  senderName: string;
  subject: string;
  pdfBase64: string;
  pdfFilename: string;
  messageType: 'meal_plan' | 'nutrition_report';
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      recipientEmail, 
      recipientName, 
      senderName,
      subject,
      pdfBase64,
      pdfFilename,
      messageType
    }: SendPdfEmailRequest = await req.json();

    // Validate input
    if (!recipientEmail || !pdfBase64 || !pdfFilename) {
      return new Response(
        JSON.stringify({ error: 'Email, PDF e nome do arquivo são obrigatórios' }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Email templates based on message type
    const emailContent = messageType === 'meal_plan' 
      ? `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #f97316, #ea580c); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">GYMFIT PRO</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px;">Plano Nutricional Personalizado</p>
          </div>
          
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb; border-top: none;">
            <h2 style="color: #1f2937; margin: 0 0 15px 0;">Olá${recipientName ? `, ${recipientName}` : ''}!</h2>
            
            <p style="color: #4b5563; line-height: 1.6;">
              ${senderName ? `<strong>${senderName}</strong> compartilhou` : 'Segue em anexo'} o cardápio nutricional para sua avaliação.
            </p>
            
            <p style="color: #4b5563; line-height: 1.6;">
              O documento em PDF anexo contém:
            </p>
            
            <ul style="color: #4b5563; line-height: 1.8;">
              <li>Resumo das metas nutricionais diárias</li>
              <li>Cardápio completo com todas as refeições</li>
              <li>Informações detalhadas de macronutrientes</li>
              <li>Espaço para anotações do profissional</li>
            </ul>
            
            <p style="color: #4b5563; line-height: 1.6; margin-top: 20px;">
              <em>Por favor, analise o documento e entre em contato para quaisquer ajustes necessários.</em>
            </p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                Este email foi enviado automaticamente pelo GymFit Pro.<br>
                © ${new Date().getFullYear()} GymFit Pro - Todos os direitos reservados.
              </p>
            </div>
          </div>
        </div>
      `
      : `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">GYMFIT PRO</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px;">Relatório Nutricional</p>
          </div>
          
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb; border-top: none;">
            <h2 style="color: #1f2937; margin: 0 0 15px 0;">Olá${recipientName ? `, ${recipientName}` : ''}!</h2>
            
            <p style="color: #4b5563; line-height: 1.6;">
              ${senderName ? `<strong>${senderName}</strong> compartilhou` : 'Segue em anexo'} o relatório de acompanhamento nutricional.
            </p>
            
            <p style="color: #4b5563; line-height: 1.6;">
              O relatório em PDF anexo inclui:
            </p>
            
            <ul style="color: #4b5563; line-height: 1.8;">
              <li>Médias de consumo calórico e macronutrientes</li>
              <li>Dados diários detalhados do período</li>
              <li>Estatísticas de aderência às metas</li>
              <li>Acompanhamento de hidratação</li>
            </ul>
            
            <p style="color: #4b5563; line-height: 1.6; margin-top: 20px;">
              <em>Utilize esses dados para acompanhar a evolução e fazer os ajustes necessários no plano alimentar.</em>
            </p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                Este email foi enviado automaticamente pelo GymFit Pro.<br>
                © ${new Date().getFullYear()} GymFit Pro - Todos os direitos reservados.
              </p>
            </div>
          </div>
        </div>
      `;

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: "GymFit Pro <onboarding@resend.dev>",
        to: [recipientEmail],
        subject: subject || (messageType === 'meal_plan' ? 'Cardápio Nutricional - GymFit Pro' : 'Relatório Nutricional - GymFit Pro'),
        html: emailContent,
        attachments: [
          {
            filename: pdfFilename,
            content: pdfBase64,
          }
        ]
      }),
    });

    const emailData = await emailResponse.json();

    if (!emailResponse.ok) {
      throw new Error(emailData.message || 'Erro ao enviar email');
    }

    console.log("Email sent successfully:", emailData);

    return new Response(JSON.stringify({ success: true, data: emailData }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-nutrition-pdf function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
