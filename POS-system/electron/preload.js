const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  printReceipt: (saleData) => ipcRenderer.invoke('print-receipt', saleData),
  getPrinters: () => ipcRenderer.invoke('get-printers')
});
