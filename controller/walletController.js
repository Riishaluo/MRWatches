const Wallet = require("../model/walletModel")

exports.renderWallet = async (req, res) => {
    try {
        const userId = req.session.userId;  
        let wallet = await Wallet.findOne({ user: userId });

        res.render('user/wallet', { wallet});
    } catch (error) {
        console.error(error);
        res.status(500).send('Error fetching wallet details');
    }
};
