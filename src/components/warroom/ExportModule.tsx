import { saveAs } from 'file-saver';

/**
 * Aksiyon notlarını (Directives) iCal formatına çevirir.
 */
export function exportToICal(tasks: any[], headline: string) {
  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  
  let icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Boho Mentos//NONSGML Coach Directives//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH'
  ].join('\r\n');

  tasks.forEach((task, index) => {
    // Gelecek 7 güne yayalım (veya bugün için)
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + (index % 7));
    startDate.setHours(9 + (index % 3), 0, 0, 0);
    
    const endDate = new Date(startDate);
    endDate.setHours(startDate.getHours() + 1);

    const formatICalDate = (date: Date) => 
      date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    icsContent += '\r\n' + [
      'BEGIN:VEVENT',
      `UID:${now}-${index}@bohomentos.com`,
      `DTSTAMP:${now}`,
      `DTSTART:${formatICalDate(startDate)}`,
      `DTEND:${formatICalDate(endDate)}`,
      `SUMMARY:[Boho Mentos] ${task.action}`,
      `DESCRIPTION:${task.subject || 'Genel'} - ${task.priority || 'Normal'} öncelikli görev.`,
      'STATUS:CONFIRMED',
      'SEQUENCE:0',
      'END:VEVENT'
    ].join('\r\n');
  });

  icsContent += '\r\nEND:VCALENDAR';

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  saveAs(blob, `${headline.replace(/\s+/g, '_')}_plani.ics`);
}

/**
 * Strateji özetini PDF olarak (window.print simülasyonu veya basitleştirilmiş HTML) indirir.
 * Not: jspdf olmadığı için şimdilik print diyaloğunu tetikleyen bir katman kullanıyoruz.
 */
export function exportToPDF(contentId: string, title: string) {
  const element = document.getElementById(contentId);
  if (!element) return;

  // Geçici bir print penceresi veya direkt print
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const html = `
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: sans-serif; padding: 40px; color: #111; line-height: 1.6; }
          h1 { color: #C17767; border-bottom: 2px solid #C17767; padding-bottom: 10px; }
          .meta { color: #666; font-size: 12px; margin-bottom: 30px; }
          pre { white-space: pre-wrap; font-size: 14px; background: #f9f9f9; padding: 20px; border-radius: 8px; }
          .footer { margin-top: 50px; font-size: 10px; color: #999; text-align: center; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <div class="meta">Boho Mentos AI Coach tarafından ${new Date().toLocaleString('tr-TR')} tarihinde oluşturuldu.</div>
        <div class="content">
          ${element.innerHTML}
        </div>
        <div class="footer">Boho Mentos v2 - Kişiselleştirilmiş YKS Hazırlık Platformu</div>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  
  // Bazı tarayıcılarda delay gerekebilir
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 500);
}
