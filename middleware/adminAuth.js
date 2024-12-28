// adminAuth.js


exports.checkAdminSession = (req, res, next) => {
   if (req.session.adminId) {
       return next();
   }

   if (req.path !== '/login') {
       return res.redirect('/admin/login');
   }
   next();
};

