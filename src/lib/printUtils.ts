// Print utility functions for receipts and reports

interface ReceiptData {
  title: string;
  subtitle?: string;
  items: { label: string; value: string }[];
  footer?: string;
  date?: Date;
}

export const printReceipt = (data: ReceiptData) => {
  const printWindow = window.open('', '_blank', 'width=400,height=600');
  if (!printWindow) {
    alert('Por favor, permita pop-ups para imprimir recibos.');
    return;
  }

  const formattedDate = (data.date || new Date()).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${data.title}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Courier New', monospace;
          padding: 20px;
          max-width: 300px;
          margin: 0 auto;
        }
        .header {
          text-align: center;
          border-bottom: 2px dashed #000;
          padding-bottom: 15px;
          margin-bottom: 15px;
        }
        .title {
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 5px;
        }
        .subtitle {
          font-size: 12px;
          color: #666;
        }
        .date {
          font-size: 11px;
          margin-top: 10px;
        }
        .items {
          margin-bottom: 15px;
        }
        .item {
          display: flex;
          justify-content: space-between;
          padding: 5px 0;
          border-bottom: 1px dotted #ccc;
        }
        .item-label {
          font-size: 12px;
          max-width: 60%;
        }
        .item-value {
          font-size: 12px;
          font-weight: bold;
          text-align: right;
        }
        .footer {
          text-align: center;
          border-top: 2px dashed #000;
          padding-top: 15px;
          margin-top: 15px;
          font-size: 11px;
        }
        .logo {
          font-size: 24px;
          font-weight: bold;
          color: #f97316;
        }
        @media print {
          body { padding: 10px; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">FRANCGYMPRO</div>
        <div class="title">${data.title}</div>
        ${data.subtitle ? `<div class="subtitle">${data.subtitle}</div>` : ''}
        <div class="date">${formattedDate}</div>
      </div>
      
      <div class="items">
        ${data.items.map(item => `
          <div class="item">
            <span class="item-label">${item.label}</span>
            <span class="item-value">${item.value}</span>
          </div>
        `).join('')}
      </div>
      
      ${data.footer ? `<div class="footer">${data.footer}</div>` : ''}
      
      <div class="no-print" style="text-align: center; margin-top: 20px;">
        <button onclick="window.print()" style="padding: 10px 20px; cursor: pointer;">
          Imprimir
        </button>
      </div>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  
  // Auto-print after a short delay
  setTimeout(() => {
    printWindow.print();
  }, 500);
};

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const generateReceiptNumber = (): string => {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `REC${year}${month}${day}${random}`;
};

export const printPaymentReceipt = (payment: {
  clientName: string;
  amount: number;
  method: string;
  description?: string;
  receiptNumber: string;
  discount?: number;
  installment?: { current: number; total: number };
}) => {
  const methodLabels: Record<string, string> = {
    cash: 'Dinheiro',
    pix: 'PIX',
    card: 'Cartão',
  };

  const items = [
    { label: 'Cliente', value: payment.clientName },
    { label: 'Valor', value: formatCurrency(payment.amount) },
    { label: 'Método', value: methodLabels[payment.method] || payment.method },
  ];

  if (payment.discount && payment.discount > 0) {
    items.push({ label: 'Desconto', value: `${payment.discount}%` });
  }

  if (payment.installment) {
    items.push({ 
      label: 'Parcela', 
      value: `${payment.installment.current}/${payment.installment.total}` 
    });
  }

  if (payment.description) {
    items.push({ label: 'Descrição', value: payment.description });
  }

  items.push({ label: 'Recibo Nº', value: payment.receiptNumber });

  printReceipt({
    title: 'RECIBO DE PAGAMENTO',
    items,
    footer: 'Obrigado pela preferência! Este recibo é válido como comprovante de pagamento.',
  });
};

export const printEnrollmentReceipt = (enrollment: {
  clientName: string;
  plan: string;
  monthlyFee: number;
  enrollmentDate: string;
  licenseKey: string;
}) => {
  printReceipt({
    title: 'COMPROVANTE DE MATRÍCULA',
    items: [
      { label: 'Aluno', value: enrollment.clientName },
      { label: 'Plano', value: enrollment.plan },
      { label: 'Mensalidade', value: formatCurrency(enrollment.monthlyFee) },
      { label: 'Data Matrícula', value: enrollment.enrollmentDate },
      { label: 'Chave de Acesso', value: enrollment.licenseKey },
    ],
    footer: 'Guarde sua chave de acesso. Ela será necessária para fazer login no sistema.',
  });
};

export const printPaymentPlan = (plan: {
  clientName: string;
  studentId?: string;
  totalAmount: number;
  installments: number;
  installmentAmount: number;
  discount: number;
  startDate: string;
  payments: { number: number; dueDate: string; status: string }[];
  pixKey?: string;
}) => {
  const printWindow = window.open('', '_blank', 'width=500,height=800');
  if (!printWindow) {
    alert('Por favor, permita pop-ups para imprimir.');
    return;
  }

  const formattedDate = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  // Generate PIX QR Code data (EMV format simplified)
  const pixQRData = plan.pixKey ? 
    `00020126${String(26 + plan.pixKey.length).padStart(2, '0')}0014BR.GOV.BCB.PIX01${String(plan.pixKey.length).padStart(2, '0')}${plan.pixKey}5204000053039865802BR5925FRANCGYMPRO ACADEMIA6009SAO PAULO62070503***6304` : '';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Carnê - ${plan.clientName}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Courier New', monospace;
          padding: 15px;
          max-width: 400px;
          margin: 0 auto;
        }
        .header {
          text-align: center;
          border-bottom: 2px dashed #000;
          padding-bottom: 15px;
          margin-bottom: 15px;
        }
        .logo {
          font-size: 24px;
          font-weight: bold;
          color: #f97316;
        }
        .title {
          font-size: 16px;
          font-weight: bold;
          margin-top: 8px;
        }
        .client-info {
          background: #f5f5f5;
          padding: 10px;
          border-radius: 8px;
          margin-bottom: 15px;
        }
        .client-name {
          font-size: 14px;
          font-weight: bold;
        }
        .student-id {
          font-size: 12px;
          color: #666;
          margin-top: 4px;
        }
        .summary {
          margin-bottom: 15px;
          padding: 10px;
          background: #fff3cd;
          border-radius: 8px;
        }
        .summary-row {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          padding: 3px 0;
        }
        .installments-title {
          font-weight: bold;
          font-size: 14px;
          text-align: center;
          margin: 15px 0 10px;
          border-top: 1px dashed #000;
          padding-top: 10px;
        }
        .installment {
          border: 1px solid #000;
          margin-bottom: 8px;
          padding: 8px;
          border-radius: 5px;
          page-break-inside: avoid;
        }
        .installment-header {
          display: flex;
          justify-content: space-between;
          font-weight: bold;
          font-size: 12px;
        }
        .installment-value {
          font-size: 16px;
          font-weight: bold;
          text-align: center;
          margin: 5px 0;
        }
        .installment-date {
          font-size: 11px;
          text-align: center;
          color: #666;
        }
        .status-paid {
          background: #d4edda;
          color: #155724;
        }
        .status-pending {
          background: #fff;
        }
        .qr-section {
          text-align: center;
          margin: 15px 0;
          padding: 10px;
          border: 1px dashed #000;
          border-radius: 8px;
        }
        .qr-title {
          font-size: 12px;
          font-weight: bold;
          margin-bottom: 8px;
        }
        .qr-code {
          width: 120px;
          height: 120px;
          margin: 0 auto;
          background: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .pix-key {
          font-size: 10px;
          color: #666;
          margin-top: 8px;
          word-break: break-all;
        }
        .footer {
          text-align: center;
          font-size: 10px;
          color: #666;
          margin-top: 15px;
          border-top: 1px dashed #000;
          padding-top: 10px;
        }
        @media print {
          body { padding: 10px; }
          .no-print { display: none; }
          .installment { page-break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">FRANCGYMPRO</div>
        <div class="title">CARNÊ DE PAGAMENTO</div>
        <div style="font-size: 11px; margin-top: 5px;">Emitido em ${formattedDate}</div>
      </div>

      <div class="client-info">
        <div class="client-name">${plan.clientName}</div>
        ${plan.studentId ? `<div class="student-id">Matrícula: ${plan.studentId}</div>` : ''}
      </div>

      <div class="summary">
        <div class="summary-row">
          <span>Valor Total:</span>
          <strong>${formatCurrency(plan.totalAmount)}</strong>
        </div>
        <div class="summary-row">
          <span>Parcelas:</span>
          <span>${plan.installments}x de ${formatCurrency(plan.installmentAmount)}</span>
        </div>
        ${plan.discount > 0 ? `
          <div class="summary-row">
            <span>Desconto:</span>
            <span>${plan.discount}%</span>
          </div>
        ` : ''}
        <div class="summary-row">
          <span>Início:</span>
          <span>${plan.startDate}</span>
        </div>
      </div>

      ${plan.pixKey ? `
        <div class="qr-section">
          <div class="qr-title">📱 PAGUE COM PIX</div>
          <div class="qr-code">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(pixQRData)}" alt="QR Code PIX" />
          </div>
          <div class="pix-key">Chave PIX: ${plan.pixKey}</div>
        </div>
      ` : ''}

      <div class="installments-title">PARCELAS</div>
      
      ${plan.payments.map(p => `
        <div class="installment ${p.status === 'paid' ? 'status-paid' : 'status-pending'}">
          <div class="installment-header">
            <span>Parcela ${p.number}/${plan.installments}</span>
            <span>${p.status === 'paid' ? '✓ PAGO' : 'PENDENTE'}</span>
          </div>
          <div class="installment-value">${formatCurrency(plan.installmentAmount)}</div>
          <div class="installment-date">Vencimento: ${p.dueDate}</div>
        </div>
      `).join('')}

      <div class="footer">
        Mantenha suas parcelas em dia.<br/>
        Documento válido como comprovante.
      </div>

      <div class="no-print" style="text-align: center; margin-top: 20px;">
        <button onclick="window.print()" style="padding: 10px 20px; cursor: pointer; font-size: 14px;">
          🖨️ Imprimir Carnê
        </button>
      </div>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  
  setTimeout(() => {
    printWindow.print();
  }, 500);
};

export const printAccountsReport = (accounts: {
  username: string;
  license_key: string;
  account_type: string;
  license_duration_days: number;
}[], type: string) => {
  const typeLabels: Record<string, string> = {
    client: 'CLIENTES',
    instructor: 'INSTRUTORES',
    admin: 'GERENTES',
    trial: 'TRIAL',
  };

  const printWindow = window.open('', '_blank', 'width=800,height=600');
  if (!printWindow) {
    alert('Por favor, permita pop-ups para imprimir.');
    return;
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Contas ${typeLabels[type] || type}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Courier New', monospace;
          padding: 20px;
        }
        .header {
          text-align: center;
          border-bottom: 2px solid #000;
          padding-bottom: 15px;
          margin-bottom: 20px;
        }
        .title {
          font-size: 24px;
          font-weight: bold;
        }
        .subtitle {
          font-size: 14px;
          color: #666;
          margin-top: 5px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        th, td {
          border: 1px solid #000;
          padding: 8px;
          text-align: left;
        }
        th {
          background: #f0f0f0;
        }
        .account-row:nth-child(even) {
          background: #f9f9f9;
        }
        .footer {
          text-align: center;
          margin-top: 20px;
          font-size: 12px;
          color: #666;
        }
        @media print {
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="title">FRANCGYMPRO - CONTAS ${typeLabels[type] || type}</div>
        <div class="subtitle">Gerado em ${new Date().toLocaleDateString('pt-BR')} - Total: ${accounts.length} contas</div>
      </div>
      
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Usuário</th>
            <th>Senha/Chave</th>
            <th>Duração</th>
          </tr>
        </thead>
        <tbody>
          ${accounts.map((acc, i) => `
            <tr class="account-row">
              <td>${i + 1}</td>
              <td><strong>${acc.username}</strong></td>
              <td style="font-family: monospace;">${acc.license_key}</td>
              <td>${acc.license_duration_days} dias</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <div class="footer">
        Documento confidencial - Uso exclusivo interno
      </div>
      
      <div class="no-print" style="text-align: center; margin-top: 20px;">
        <button onclick="window.print()" style="padding: 10px 20px; cursor: pointer;">
          Imprimir
        </button>
      </div>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  
  setTimeout(() => {
    printWindow.print();
  }, 500);
};

// Generate text version of payment plan for WhatsApp/Email sharing
export const generatePaymentPlanText = (plan: {
  clientName: string;
  studentId?: string;
  totalAmount: number;
  installments: number;
  installmentAmount: number;
  discount: number;
  startDate: string;
  payments: { number: number; dueDate: string; status: string }[];
  pixKey?: string;
  gymName?: string;
}): string => {
  let text = `📄 *CARNÊ DE PAGAMENTO*\n`;
  text += `${plan.gymName || 'FRANCGYMPRO'}\n\n`;
  text += `👤 *Cliente:* ${plan.clientName}\n`;
  if (plan.studentId) {
    text += `🎫 *Matrícula:* ${plan.studentId}\n`;
  }
  text += `\n`;
  text += `💰 *Valor Total:* ${formatCurrency(plan.totalAmount)}\n`;
  text += `📊 *Parcelas:* ${plan.installments}x de ${formatCurrency(plan.installmentAmount)}\n`;
  if (plan.discount > 0) {
    text += `🏷️ *Desconto:* ${plan.discount}%\n`;
  }
  text += `📅 *Início:* ${plan.startDate}\n\n`;
  
  text += `*PARCELAS:*\n`;
  plan.payments.forEach(p => {
    const status = p.status === 'paid' ? '✅' : '⏳';
    text += `${status} Parcela ${p.number}/${plan.installments} - Venc: ${p.dueDate} - ${formatCurrency(plan.installmentAmount)}\n`;
  });
  
  if (plan.pixKey) {
    text += `\n📱 *PAGUE COM PIX*\n`;
    text += `Chave: ${plan.pixKey}\n`;
  }
  
  text += `\n_Mantenha suas parcelas em dia._`;
  
  return text;
};
