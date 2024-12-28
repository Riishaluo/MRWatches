const Offer = require("../model/offerModel")
const Category = require('../model/categoryModel');
const Product = require('../model/productModel');



exports.renderAdminOffer = async (req,res)=>{

    const offers = await Offer.find()
    
    res.render("admin/offerList",{offers})
}

exports.renderAddOfferPage = async (req, res) => {
    try {
        const categories = await Category.find(); 
        const products = await Product.find();   
        res.render('admin/addOffer', { categories, products });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

exports.addOffer = async (req, res) => {
    try {
        const { 
            title, 
            description, 
            discountType, 
            discountValue, 
            offerType, 
            product, 
            category, 
            startDate, 
            endDate 
        } = req.body;
    
        console.log("Product id:", product);   

        if (!title || !description || !discountType || !discountValue || !offerType) {
            return res.status(400).send("All required fields must be provided.");
        }

        if (discountValue <= 0) {
            return res.status(400).send("Discount value must be greater than 0.");
        }

        const newOffer = new Offer({
            title,
            description,
            discount: {
                type: discountType,
                value: discountValue
            },
            offerType,
            startDate,
            endDate
        });

        if (offerType === "product") {
            if (!product) return res.status(400).send("Product ID is required for product-based offers.");
            newOffer.productId = product;
        } else if (offerType === "category") {
            if (!category) return res.status(400).send("Category ID is required for category-based offers.");
            newOffer.categoryId = category;
        }

        await newOffer.save();
        res.redirect("/admin/offer");
    } catch (error) {
        console.error("Error adding offer:", error);
        res.status(500).send("Internal server error.");
    }
};

exports.editOffer = async (req, res) => {
    try {
        const { id, title, description, discountType, discountValue, startDate, endDate } = req.body;

        if (!id) return res.status(400).send("Offer ID is required.");

        if (!title || !description || !discountType || !discountValue) {
            return res.status(400).send("All required fields must be provided.");
        }

        if (discountValue <= 0) {
            return res.status(400).send("Discount value must be greater than 0.");
        }

        const updatedOffer = await Offer.findByIdAndUpdate(
            id,
            {
                title,
                description,
                discount: { type: discountType, value: discountValue },
                startDate,
                endDate
            },
            { new: true } 
        );

        if (!updatedOffer) {
            return res.status(404).send("Offer not found.");
        }

        res.redirect("/admin/offer");
    } catch (error) {
        console.error("Error editing offer:", error);
        res.status(500).send("Internal server error.");
    }
};


exports.deleteOffer = async (req,res)=>{
    try{
        const {id} = req.body
        console.log(id)
        const offerId = await Offer.findByIdAndDelete(id)

        if(!offerId){
            return res.status(404).json({message:"Cant delete"})
        }
    }catch(error){
        console.log(error)
    }
}