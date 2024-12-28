const Product = require('../model/productModel');
const Category = require("../model/categoryModel")
const multer = require("multer")
const fs = require("fs")
const path = require("path")






exports.getProducts = async (req,res)=>{
try{
    const products = await Product.find().populate("category")
    const categories = await Category.find()
    res.render("admin/product",{products,categories})
}catch(error){
    console.log("No product is found")
}
   
}
  

//multer
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        
        const uploadPath = path.join(__dirname, '../uploads');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
        console.log('Storage: File upload path set.');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
        console.log('Storage: Filename generated.');
    }
});

exports.upload = multer({ storage: storage });

// Add a new product
exports.showAddProductPage = async (req, res) => {
    try {
        const categories = await Category.find(); 
        res.render('admin/addProduct', { categories }); 
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).send('Server Error');
    }
};

exports.addProduct = async (req, res) => {
    try {
        console.log('Processing addProduct request.');

        const { productName, price, category, description,stock } = req.body;

        console.log(productName, price, category, description,stock );
        
        const imagePaths = req.files.map(file => `uploads/${file.filename}`);

        const newProduct = new Product({ 
            name:productName, 
            price,
            category,
            description,
            images: imagePaths,
            stock: Number(stock),
        });

        await newProduct.save();
        console.log('Product added successfully.');

        res.status(200).json({success:true})

    } catch (error) {
        console.error('Error adding product:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error adding product' 
        });
    }
};


// Editing the existing product
exports.updateProduct = async (req, res) => {
    const productId = req.params.id;
    try {
        const updatedData = {
         name: req.body.name,
         price: req.body.price,
         description: req.body.description,
         category: req.body.category,
         stock:req.body.stock
        };
        if (req.files && req.files.length > 0) {
            const imagePaths = req.files.map(file => `uploads/${file.filename}`);
            updatedData.images = imagePaths; 
        }
        

        await Product.findByIdAndUpdate(productId, updatedData, { new: true });

        
        res.redirect('/admin/products');
    } catch (error) {
        console.error(error);
        
        res.status(500).send('Error updating product');
    }
};



exports.toggleListing = async (req, res) => {
    const productId = req.params.id;
    const { isListed } = req.body;
    
    try {
        const updatedProduct = await Product.findByIdAndUpdate(
            productId,
            { isListed },
            { new: true }
        );

         if (updatedProduct) {
            res.json({ success: true, isListed: updatedProduct.isListed });
        } else {
            res.json({ success: false, message: 'Product not found.' });
        }
    } catch (error) {
        console.error('Error toggling listing status:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

