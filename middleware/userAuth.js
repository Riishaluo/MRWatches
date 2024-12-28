


const User = require('../model/userModel'); // Make sure to require your User model

const checkSession = async (req, res, next) => {
    if (req.session.userId) {
        try {
            const user = await User.findById(req.session.userId);
            if (!user) {
                req.session.destroy(() => {
                    res.redirect('/login'); 
                });
            } else if (user.isBlocked) {
                req.session.destroy(() => {
                    res.redirect('/blocked'); 
                });
            } else {
                next();
            }
        } catch (err) {
            console.error(err);
            res.redirect('/login'); 
        }
    } else {
        res.redirect('/login'); 
    }
};


const isLogin = (req,res,next)=>{
    if(req.session.userId){
        res.redirect('/')
    }else{
        next()
    }
}




module.exports ={checkSession , isLogin}