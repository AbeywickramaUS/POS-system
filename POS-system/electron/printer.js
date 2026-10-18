const { ThermalPrinter, PrinterTypes } = require('node-thermal-printer');

/**
 * Builds and sends an ESC/POS receipt to the configured thermal printer.
 * 
 * @param {Object} data
 * @param {Object} data.sale - The sale document
 * @param {Object} data.settings - Shop settings
 */
async function printReceipt(data) {
  const { sale, settings } = data;

  if (!settings.printerName) {
    throw new Error('No printer configured. Please set a printer in Settings.');
  }

  const printer = new ThermalPrinter({
    type: PrinterTypes.EPSON,
    interface: `printer:${settings.printerName}`,
    removeSpecialCharacters: false,
    lineCharacter: '-',
    options: {
      timeout: 5000
    }
  });

  const isConnected = await printer.isPrinterConnected();
  if (!isConnected) {
    throw new Error(`Printer "${settings.printerName}" is not connected or not found.`);
  }

  const LINE_WIDTH = 42;

  // Helper: center text
  const center = (text) => {
    const pad = Math.max(0, Math.floor((LINE_WIDTH - text.length) / 2));
    return ' '.repeat(pad) + text;
  };

  // Helper: right-align a value
  const rightAlign = (label, value) => {
    const valStr = String(value);
    const spaces = Math.max(1, LINE_WIDTH - label.length - valStr.length);
    return label + ' '.repeat(spaces) + valStr;
  };

  // ===== HEADER =====
  printer.alignCenter();
  printer.println('='.repeat(LINE_WIDTH));
  printer.bold(true);
  printer.setTextSize(1, 1);
  printer.println(settings.shopName || 'POS Shop');
  printer.bold(false);
  printer.setTextNormal();

  // Address lines
  if (settings.address) {
    const addressParts = settings.address.split(',').map(s => s.trim());
    // Print address in 2-line chunks
    let line = '';
    for (const part of addressParts) {
      if ((line + ', ' + part).length > LINE_WIDTH - 4) {
        printer.println(line);
        line = part;
      } else {
        line = line ? line + ', ' + part : part;
      }
    }
    if (line) printer.println(line);
  }

  // Telephone
  if (settings.telephone) {
    const tels = settings.telephone.split('/').map(s => s.trim());
    printer.println(`Tel: ${tels[0]}`);
    if (tels.length > 1) {
      printer.println(`     ${tels.slice(1).join(' / ')}`);
    }
  }

  printer.println('='.repeat(LINE_WIDTH));

  // ===== INVOICE INFO =====
  printer.alignLeft();
  printer.println(`Invoice: ${sale.invoiceNo}`);
  const saleDate = new Date(sale.createdAt);
  const dateStr = saleDate.toLocaleDateString('en-GB') + ' ' +
    saleDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  printer.println(`Date: ${dateStr}`);
  printer.println('');

  // ===== COLUMN HEADERS =====
  const hdrItem = 'Item';
  const hdrQty = 'Qty';
  const hdrPrice = 'Price';
  const hdrTotal = 'Total';
  printer.bold(true);
  printer.println(
    hdrItem.padEnd(20) + hdrQty.padStart(5) + hdrPrice.padStart(8) + hdrTotal.padStart(9)
  );
  printer.bold(false);
  printer.println('-'.repeat(LINE_WIDTH));

  // ===== ITEMS =====
  for (const item of sale.items) {
    const name = item.name.length > 19 ? item.name.substring(0, 19) : item.name;
    const qty = String(item.quantity);
    const price = item.unitPrice.toFixed(2);
    const total = (item.unitPrice * item.quantity).toFixed(2);

    printer.println(
      name.padEnd(20) + qty.padStart(5) + price.padStart(8) + total.padStart(9)
    );

    // Item-level discount
    if (item.discount > 0) {
      printer.println(`  Discount:`.padEnd(33) + `-${item.discount.toFixed(2)}`.padStart(9));
    }
  }

  printer.println('-'.repeat(LINE_WIDTH));

  // ===== TOTALS =====
  printer.println(rightAlign('Subtotal:', sale.subtotal.toFixed(2)));

  if (sale.orderDiscount > 0) {
    printer.println(rightAlign('Order Discount:', `-${sale.orderDiscount.toFixed(2)}`));
  }

  printer.bold(true);
  printer.setTextSize(1, 1);
  printer.println(rightAlign('GRAND TOTAL:', sale.grandTotal.toFixed(2)));
  printer.bold(false);
  printer.setTextNormal();

  printer.println('');
  if (sale.paymentType === 'credit') {
    printer.println(rightAlign('Payment Mode:', 'CREDIT CUSTOMER'));
    if (sale.borrowerName) {
      printer.println(rightAlign('Borrower:', sale.borrowerName));
    }
    if (sale.cashReceived > 0) {
      printer.println(rightAlign('Paid Upfront:', sale.cashReceived.toFixed(2)));
    }
    printer.println(rightAlign('Added to Credit:', (sale.creditAmount || 0).toFixed(2)));
  } else {
    printer.println(rightAlign('Payment Mode:', 'CASH'));
    printer.println(rightAlign('Cash:', sale.cashReceived.toFixed(2)));
    printer.println(rightAlign('Change:', sale.changeGiven.toFixed(2)));
  }

  // ===== FOOTER =====
  printer.println('='.repeat(LINE_WIDTH));
  printer.alignCenter();
  printer.println(settings.receiptFooter || 'Thank you!');
  printer.println('='.repeat(LINE_WIDTH));

  printer.cut();

  // Execute print
  await printer.execute();
  console.log('✅ Receipt printed successfully');
}

module.exports = { printReceipt };
