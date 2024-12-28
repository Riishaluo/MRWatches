

const User = require('../model/userModel');




const checkBlockedUser = async (req, res, next) => {
    if (!req.session.userId) {
        return res.redirect('/login'); 
    }
    try {
        const user = await User.findById(req.session.userId);
        if (user && user.isBlocked) {
           req.session.destroy((err)=>{
            console.log(err)
           })
           return res.render('user/login',{message:"Your account has been blocked"});
        }
        next(); 
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal server error.');
    }
};


module.exports = {checkBlockedUser}
