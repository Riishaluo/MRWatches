const User = require('../model/userModel');




exports.renderUserManagement = async (req, res) => {
    try {
        const users = await User.find();
        res.render('admin/userManage', { users }); 
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).send('Server error');
    }
};

exports.toggleUserBlockStatus = async (req, res) => {
    const { isBlocked } = req.body;
    try {
        await User.findByIdAndUpdate(req.params.id, { isBlocked });
        res.json({ success: true });
    } catch (error) {
        console.error('Error toggling user block status:', error);
        res.status(500).json({ success: false, message: 'Error toggling block status' });
    }
};