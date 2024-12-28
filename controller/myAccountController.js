
const User = require('../model/userModel');
const Address = require("../model/addressModel")



exports.myAccountDetails = async (req, res) => {
    try {

        const user = await User.findById(req.session.userId);
        
        if (!user) {
            return res.render('user/login', { message: 'Please log in to access your account.' });
        }

       
       
        const message = req.session.message || null; 
        req.session.message = null; 

        res.render('user/myAccount', { user, message });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal server error.');
    }
};

exports.updateUserDetails = async (req, res) => {
    try {
        const { email } = req.body; 

      
        await User.findByIdAndUpdate(req.session.userId, { email }); 

    
        res.redirect('/my-account/details'); 
    } catch (error) {
        console.error("Error updating user details:", error);
        res.status(500).send("An error occurred while updating your details.");
    }
};


exports.renderMyAddress = async (req, res) => {
    try {
       
        if (!req.session.userId) {
            return res.redirect('/login');
        }

        const user = await User.findById(req.session.userId);
        
        if (!user) {
            req.session.destroy(() => {
                res.redirect('/login');
            });
        } else {
            const addresses = await Address.find({ userId: req.session.userId });
            res.render('user/myAddress', { addresses });
        }
    } catch (error) {
        console.error('Error fetching addresses:', error);
    }
};


    exports.addAddress = async (req, res) => {
        try {
            const { name, street, city, state, zip , phone } = req.body; 
            const newAddress = new Address({
                userId: req.session.userId,
                name,      
                street,
                city,
                state,
                zip,
                phone,
            });
            await newAddress.save();
            res.redirect('/my-address');  
        } catch (error) {
            console.error('Error adding address:', error);
            res.status(500).send('Server error');
        }
    };    

    exports.updateAddress = async (req, res) => {
        try {
            const { addressId, name, street, city, state, zip,phone } = req.body;
    
            const updatedAddress = await Address.findByIdAndUpdate(addressId, {
                name,
                street,
                city,
                state,
                zip,
                phone
            }, { new: true });
    
            if (!updatedAddress) {
                return res.status(404).send('Address not found');
            }
            res.redirect('/my-address');
        } catch (err) {
            console.error(err);
            res.status(500).send('Server error');
        }
    };


exports.deleteAddress = async (req, res) => {
    try {
        const { addressId } = req.body;
        await Address.findByIdAndDelete(addressId);
        res.redirect('/my-address');
    } catch (error) {
        console.error('Error deleting address:', error);
        res.status(500).send('Internal Server Error');
    }
};
