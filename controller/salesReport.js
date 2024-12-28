
const orderSchema = require("../model/orderModel")
const moment = require('moment');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');


const calculateTotals = (orders) => {
    const totalAmount = orders.reduce((acc, item) => acc + (item.totalPrice || 0), 0);
    const totalDiscount = orders.reduce((acc, item) => acc + (item.coupon ? item.coupon.discountValue || 0 : 0), 0);
    return { totalAmount, totalDiscount };
};


exports.loadSalesReport = async (req, res) => {
    try {
        const orders = await orderSchema.find({}).populate('coupon').lean();

        const { totalAmount, totalDiscount } = calculateTotals(orders);

        res.render('admin/salesReport', {
            orders,
            totalAmount,
            totalDiscount,
            moment,
        });
    } catch (error) {
        console.error('Error loading sales report:', error);
        res.status(500).send('Internal Server Error');
    }
};


exports.filterSalesReport = async (req, res) => {
    try {
        const { filterValue, startDate, endDate } = req.body;
        console.log('Start Date:', startDate);
        console.log('End Date:', endDate);

        let filter = {};

        if (filterValue === 'today') {
            const start = moment().startOf('day').toDate();
            const end = moment().endOf('day').toDate();
            filter.createdAt = { $gte: start, $lte: end };
        } else if (filterValue === 'this-week') {
            const start = moment().startOf('week').toDate();
            const end = moment().endOf('week').toDate();
            filter.createdAt = { $gte: start, $lte: end };
        } else if (filterValue === 'this-month') {
            const start = moment().startOf('month').toDate();
            const end = moment().endOf('month').toDate();
            filter.createdAt = { $gte: start, $lte: end };
        } else if (filterValue === 'this-year') {
            const start = moment().startOf('year').toDate();
            const end = moment().endOf('year').toDate();
            filter.createdAt = { $gte: start, $lte: end };
        } else if (filterValue === 'custom' && startDate && endDate) {
            filter.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }

        const orders = await orderSchema.find(filter).populate('coupon').lean();
        console.log('Orders:', orders);

        const { totalAmount, totalDiscount, totalSales } = calculateTotals(orders);

        res.json({ success: true, orders, totalAmount, totalDiscount, totalSales });
    } catch (error) {
        console.error('Error filtering sales report:', error);
        res.json({ success: false, message: 'Error filtering sales report' });
    }
};

exports.downloadPDF = async (req, res) => {
    try {
        const { orders, totalAmount, totalDiscount } = req.body;
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const filename = "sales-report.pdf";

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        doc.pipe(res);

        const pageWidth = doc.page.width;
        const pageHeight = doc.page.height;
        const margin = 50;
        const contentWidth = pageWidth - 2 * margin;

        const addCenteredText = (text, fontSize, yPosition) => {
            doc.fontSize(fontSize)
                .text(text, margin, yPosition, {
                    width: contentWidth,
                    align: 'center'
                });
        };

        addCenteredText("Sales Report", 25, margin);
        addCenteredText(`Generated on: ${new Date().toLocaleDateString("en-IN")}`, 12, margin + 30);

        const headers = ["Order ID", "Total Amount", "Coupon Discount", "Order Date"];
        const columnWidths = [120, 100, 120, 130];
        const tableWidth = columnWidths.reduce((sum, width) => sum + width, 0);
        const tableX = (pageWidth - tableWidth) / 2;
        const rowHeight = 30;
        const maxRowsPerPage = Math.floor((pageHeight - 250) / rowHeight);

        const drawTableLines = (x, y, widths, height) => {
            let currentX = x;
            widths.forEach(width => {
                doc.rect(currentX, y, width, height).stroke();
                currentX += width;
            });
        };

        const addRowContent = (x, y, data, widths, fontSize = 8, isHeader = false) => {
            let currentX = x;
            data.forEach((text, i) => {
                doc.font(isHeader ? 'Helvetica-Bold' : 'Helvetica')
                    .fontSize(fontSize)
                    .text(text,
                        currentX + 5,
                        y + (rowHeight - fontSize) / 2,
                        {
                            width: widths[i] - 10,
                            align: 'center',
                            lineBreak: false
                        });
                currentX += widths[i];
            });
        };

        let currentY = margin + 80;

        const drawHeader = (y) => {
            drawTableLines(tableX, y, columnWidths, rowHeight);
            addRowContent(tableX, y, headers, columnWidths, 10, true);
            return y + rowHeight;
        };

        currentY = drawHeader(currentY);

        const generateOrderId = () => {
            const timestamp = Date.now(); 
            const randomNumber = Math.floor(1000 + Math.random() * 9000); 
            return `ORD-${timestamp}-${randomNumber}`; 
        };

        orders.forEach((order, index) => {
            if (index > 0 && index % maxRowsPerPage === 0) {
                doc.addPage();
                currentY = margin;
                currentY = drawHeader(currentY);
            }

            const rowData = [
                generateOrderId(),
                `Rs.${order.totalAmount.toLocaleString('en-IN')}`,
                `Rs.${order.couponDiscount.toLocaleString('en-IN')}`,
                order.orderDate.split(' ')[0] 
            ];

            drawTableLines(tableX, currentY, columnWidths, rowHeight);
            addRowContent(tableX, currentY, rowData, columnWidths);
            currentY += rowHeight;
        });

        currentY += 20; 
        const summaryWidth = 300; 
        const summaryX = (pageWidth - summaryWidth) / 2; 

        doc.rect(summaryX, currentY, summaryWidth, 30).stroke();
        doc.font('Helvetica-Bold')
            .fontSize(12)
            .text('Summary', summaryX, currentY + 8, {
                width: summaryWidth,
                align: 'center'
            });

        currentY += 40;

        const summaryItems = [
            { label: "Total Sales", value: totalAmount },
            { label: "Total Discount", value: totalDiscount }
        ];

        summaryItems.forEach(item => {
            const labelWidth = summaryWidth - 100; 
            const valueWidth = 100;
        
            doc.font('Helvetica-Bold')
                .fontSize(11)
                .text(item.label, summaryX, currentY, {
                    width: labelWidth, 
                    align: 'left'
                });
        
                doc.font('Helvetica')
                .fontSize(11)
                .text(item.value, summaryX + labelWidth, currentY - 2, {
                    width: valueWidth, 
                    align: 'right'
                });
            
        
            currentY += 15; 
        });
        

        doc.end();
    } catch (error) {
        console.error(`Error in downloadPDF: ${error}`);
        res.status(500).send("Internal server error.");
    }
};



exports.downloadExcel = async (req, res) => {
    try {
        const { orders, totalAmount, totalDiscount } = req.body;

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Orders');

        worksheet.columns = [
            { header: 'Order ID', key: 'orderId', width: 30 },
            { header: 'Total Amount', key: 'totalAmount', width: 15 },
            { header: 'Coupon Discount', key: 'couponDiscount', width: 20 },
            { header: 'Order Date', key: 'orderDate', width: 15 },
        ];


        orders.forEach((order) => {
            worksheet.addRow({
                orderId: order.orderId,
                totalAmount: order.totalAmount,
                couponDiscount: order.couponDiscount,
                orderDate: order.orderDate
            });
        });

        worksheet.addRow(['']);

        worksheet.addRow(['Summary']);
        worksheet.addRow(['', 'Total Amount', totalAmount]);
        worksheet.addRow(['', 'Total Discount', totalDiscount]);


        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=sales-report.xlsx');

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error(`Error in downloadExcel: ${error}`);
        res.status(500).send('Internal server error.');
    }
};
