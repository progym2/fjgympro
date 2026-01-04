import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCPF } from './inputValidation';

interface UserData {
  id: string;
  username: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  cpf: string | null;
  city: string | null;
  cref: string | null;
  license_key?: string;
  license_type?: string;
  license_status?: string;
  enrollment_status?: string | null;
}

interface ExportOptions {
  title: string;
  filename: string;
  includeInactive?: boolean;
}

// Format user data for export
const formatUserForExport = (user: UserData) => ({
  'Nome Completo': user.full_name || '-',
  'Usuário': user.username,
  'CPF': user.cpf ? formatCPF(user.cpf) : '-',
  'Email': user.email || '-',
  'Telefone': user.phone || '-',
  'Cidade': user.city || '-',
  'CREF': user.cref || '-',
  'Tipo Licença': user.license_type === 'full' ? 'Completa' : 
                  user.license_type === 'demo' ? 'Demo' : 
                  user.license_type === 'trial' ? 'Trial' : 
                  user.license_type || '-',
  'Status Licença': user.license_status === 'active' ? 'Ativa' :
                    user.license_status === 'expired' ? 'Expirada' :
                    user.license_status === 'blocked' ? 'Bloqueada' :
                    user.license_status || '-',
  'Status Matrícula': user.enrollment_status === 'active' ? 'Ativo' :
                      user.enrollment_status === 'unlinked' ? 'Desvinculado' :
                      user.enrollment_status === 'deleted' ? 'Excluído' :
                      user.enrollment_status || '-',
});

// Export to Excel
export const exportToExcel = (
  clients: UserData[],
  instructors: UserData[],
  options: ExportOptions
) => {
  const workbook = XLSX.utils.book_new();
  const dateStr = format(new Date(), 'dd-MM-yyyy_HH-mm', { locale: ptBR });

  // Clients sheet
  if (clients.length > 0) {
    const clientsData = clients.map(formatUserForExport);
    const clientsSheet = XLSX.utils.json_to_sheet(clientsData);
    
    // Set column widths
    clientsSheet['!cols'] = [
      { wch: 30 }, // Nome
      { wch: 20 }, // Usuário
      { wch: 15 }, // CPF
      { wch: 30 }, // Email
      { wch: 15 }, // Telefone
      { wch: 20 }, // Cidade
      { wch: 15 }, // CREF
      { wch: 12 }, // Tipo Licença
      { wch: 12 }, // Status Licença
      { wch: 15 }, // Status Matrícula
    ];
    
    XLSX.utils.book_append_sheet(workbook, clientsSheet, 'Clientes');
  }

  // Instructors sheet
  if (instructors.length > 0) {
    const instructorsData = instructors.map(formatUserForExport);
    const instructorsSheet = XLSX.utils.json_to_sheet(instructorsData);
    
    instructorsSheet['!cols'] = [
      { wch: 30 },
      { wch: 20 },
      { wch: 15 },
      { wch: 30 },
      { wch: 15 },
      { wch: 20 },
      { wch: 15 },
      { wch: 12 },
      { wch: 12 },
      { wch: 15 },
    ];
    
    XLSX.utils.book_append_sheet(workbook, instructorsSheet, 'Instrutores');
  }

  // Summary sheet
  const summaryData = [
    { 'Relatório': options.title },
    { 'Relatório': `Data de Geração: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}` },
    { 'Relatório': '' },
    { 'Relatório': `Total de Clientes: ${clients.length}` },
    { 'Relatório': `Total de Instrutores: ${instructors.length}` },
    { 'Relatório': `Total Geral: ${clients.length + instructors.length}` },
  ];
  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  summarySheet['!cols'] = [{ wch: 50 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumo');

  // Download
  XLSX.writeFile(workbook, `${options.filename}_${dateStr}.xlsx`);
};

// Export to PDF
export const exportToPDF = (
  clients: UserData[],
  instructors: UserData[],
  options: ExportOptions
) => {
  const doc = new jsPDF('landscape', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const dateStr = format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  let currentY = 15;

  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(options.title, pageWidth / 2, currentY, { align: 'center' });
  
  currentY += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Gerado em: ${dateStr}`, pageWidth / 2, currentY, { align: 'center' });
  
  currentY += 10;

  // Summary box
  doc.setFillColor(240, 240, 240);
  doc.rect(10, currentY, pageWidth - 20, 15, 'F');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`Total de Clientes: ${clients.length}`, 15, currentY + 6);
  doc.text(`Total de Instrutores: ${instructors.length}`, 100, currentY + 6);
  doc.text(`Total Geral: ${clients.length + instructors.length}`, 200, currentY + 6);
  
  currentY += 20;

  // Table headers
  const headers = [
    ['Nome', 'Usuário', 'CPF', 'Email', 'Telefone', 'Cidade', 'Status']
  ];

  // Clients table
  if (clients.length > 0) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('CLIENTES', 10, currentY);
    currentY += 5;

    const clientRows = clients.map(user => [
      user.full_name || '-',
      user.username,
      user.cpf ? formatCPF(user.cpf) : '-',
      user.email || '-',
      user.phone || '-',
      user.city || '-',
      user.enrollment_status === 'active' ? 'Ativo' : 
      user.enrollment_status === 'unlinked' ? 'Desvinculado' : 
      user.enrollment_status || '-',
    ]);

    autoTable(doc, {
      startY: currentY,
      head: headers,
      body: clientRows,
      theme: 'striped',
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 9,
      },
      bodyStyles: {
        fontSize: 8,
      },
      columnStyles: {
        0: { cellWidth: 45 },
        1: { cellWidth: 30 },
        2: { cellWidth: 30 },
        3: { cellWidth: 50 },
        4: { cellWidth: 30 },
        5: { cellWidth: 35 },
        6: { cellWidth: 25 },
      },
      margin: { left: 10, right: 10 },
    });

    currentY = (doc as any).lastAutoTable.finalY + 15;
  }

  // Instructors table
  if (instructors.length > 0) {
    // Check if we need a new page
    if (currentY > 180) {
      doc.addPage();
      currentY = 15;
    }

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('INSTRUTORES', 10, currentY);
    currentY += 5;

    const instructorHeaders = [
      ['Nome', 'Usuário', 'CPF', 'CREF', 'Email', 'Telefone', 'Status']
    ];

    const instructorRows = instructors.map(user => [
      user.full_name || '-',
      user.username,
      user.cpf ? formatCPF(user.cpf) : '-',
      user.cref || '-',
      user.email || '-',
      user.phone || '-',
      user.enrollment_status === 'active' ? 'Ativo' : 
      user.enrollment_status === 'unlinked' ? 'Desvinculado' : 
      user.enrollment_status || '-',
    ]);

    autoTable(doc, {
      startY: currentY,
      head: instructorHeaders,
      body: instructorRows,
      theme: 'striped',
      headStyles: {
        fillColor: [34, 197, 94],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 9,
      },
      bodyStyles: {
        fontSize: 8,
      },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 25 },
        2: { cellWidth: 30 },
        3: { cellWidth: 25 },
        4: { cellWidth: 50 },
        5: { cellWidth: 30 },
        6: { cellWidth: 25 },
      },
      margin: { left: 10, right: 10 },
    });
  }

  // Footer on all pages
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Página ${i} de ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  // Download
  const fileDate = format(new Date(), 'dd-MM-yyyy_HH-mm', { locale: ptBR });
  doc.save(`${options.filename}_${fileDate}.pdf`);
};
