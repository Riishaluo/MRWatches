const express = require("express");
const router = express.Router();




// Controller imports
const adminController = require("../controller/adminController");
const categoryController = require("../controller/adminCategory");
const productController = require("../controller/productController");
const userManageController = require("../controller/userManageController")
const adminOrderController = require("../controller/adminOrderController")
const couponController = require("../controller/adminCouponController")
const offerController = require("../controller/adminOfferController")
const salesReportController = require("../controller/salesReport")

// Middleware imports
const adminAuth = require("../middleware/adminAuth");

// Admin authentication routes
router.get("/login", adminAuth.checkAdminSession, adminController.adminloginpage);
router.post("/login", adminController.adminLogin);

// Admin dashboard route
router.get("/dashboard", adminAuth.checkAdminSession, adminController.renderDashboard);
router.post('/dashboard/filter', adminController.fetchSalesData);




// Category routes with 
router.get("/category",adminAuth.checkAdminSession,categoryController.renderAdminCategoryPage);
router.get("/category/add",  categoryController.addCategoryPage);
router.post("/category/add",  categoryController.addCategory);
router.get("/category/:id/edit",  categoryController.editCategoryPage);
router.post("/category/:id", categoryController.editCategory);
router.post("/category/:id/toggle-listing",  categoryController.toggleListing);


// Product routes with 
router.get("/products", adminAuth.checkAdminSession, productController.getProducts); 
router.get('/add', productController.showAddProductPage); 
router.post('/add-product', productController.upload.array('images', 3), productController.addProduct); 
router.post('/product/:id', productController.upload.array("images",3),productController.updateProduct); 
router.post("/toggle-product/:id", productController.toggleListing);


//User Management

router.get('/users',adminAuth.checkAdminSession,userManageController.renderUserManagement);
router.post('/toggle-user-block/:id', userManageController.toggleUserBlockStatus);


//ordres
router.get('/orders',adminAuth.checkAdminSession, adminOrderController.getAllOrders);
router.get('/orders/:orderId',adminOrderController.getOrderDetails);
router.post("/orders/:id/status",adminOrderController.updateOrderStatus)


//coupon
router.get("/adminCoupon",couponController.listCoupon)  
router.get("/adminAddCoupon",couponController.renderAddCoupon)
router.post("/coupon/add",couponController.addCoupon)
router.get("/coupon/edit/:id",couponController.renderEditCoupon)
router.post("/coupon/update/:id",couponController.editCoupon)
router.get("/coupon/delete/:id",couponController.deleteCoupon)

router.post('/handle-return-request',adminOrderController.handleReturnRequest);


//offer
router.get("/offer",offerController.renderAdminOffer)
router.get("/add-offer",offerController.renderAddOfferPage)
router.post("/add-offer",offerController.addOffer)
router.post("/edit-offer",offerController.editOffer)
router.post("/delete",offerController.deleteOffer)


//salesReport
router.get('/sales-report', salesReportController.loadSalesReport);

router.post('/filter-sales-report', salesReportController.filterSalesReport);

router.post('/download-pdf', salesReportController.downloadPDF);

router.post('/download-excel', salesReportController.downloadExcel);



module.exports = router;
 