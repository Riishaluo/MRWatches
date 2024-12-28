const couponModel = require("../model/couponModel")


exports.listCoupon = async (req,res)=>{
    try{
        const coupons = await couponModel.find().sort({createdAt : -1})
        res.render("admin/adminCoupon",{coupons})
    }catch(error){
        console.log(error)
    }
}

exports.renderAddCoupon = (req,res)=>{
    res.render("admin/adminAddCoupon")
}

exports.addCoupon = async (req,res)=>{
    try{
        const {name,code,discountType,discountValue,minDiscount,startDate,expirationDate,} = req.body

        const newCoupon = new couponModel({
            name,
            code,
            discountType,
            discountValue,
            minDiscount,
            startDate,
            expirationDate
        })
    
       await newCoupon.save()

       res.redirect("/admin/adminCoupon");

    }catch(error){
        console.log(error)
    }
}


//edit
exports.renderEditCoupon = async (req,res)=>{

    const couponId = req.params.id

    const coupon = await couponModel.findById(couponId)

    if(!coupon){
      return  res.status(404).json({message : "No coupon Found"})
    }

    res.render("admin/editCoupon" , {coupon})
}

exports.editCoupon = async (req,res)=>{
    try{
        const couponId = req.params.id

        const {name,code,discountType,discountValue,minDiscount,startDate,expirationDate} = req.body
    
        const updatedCoupon = await couponModel.findByIdAndUpdate(couponId,
            {
            name,
            code,
            discountType,
            discountValue,
            minDiscount,
            startDate,
            expirationDate,
        },
           {new : true}
        )

        if(!updatedCoupon){
            return res.status(404).json({message : "No coupons found"})
        }
        res.redirect("/admin/adminCoupon")

    }catch(error){
        console.log(error)
    }
}



exports.deleteCoupon = async (req,res)=>{
    try{
        const couponId = req.params.id
        await couponModel.findByIdAndDelete(couponId)
    
        res.redirect("/admin/adminCoupon")
    }catch(error){
        console.log(error)
    }
}
