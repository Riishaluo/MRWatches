
const Order = require('../model/orderModel'); 
const Wallet = require("../model/walletModel")

exports.getAllOrders = async (req, res) => {
    try {
        
        const orders = await Order.find()
            .populate('userId')
            .populate('address')
            .populate('cartItems.product')                            
            .sort({ createdAt: -1 });          

        
        if (!orders || orders.length === 0) {
            return res.render('admin/adminOrderList', { message: 'No orders found' });
        }
  
        res.render('admin/adminOrderList', { orders }); 
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};


exports.getOrderDetails = async (req, res) => {
    try {
        const orderId = req.params.orderId;

        const order = await Order.findById(orderId)
            .populate('userId', 'name email')
            .populate('cartItems.product')
            .populate('address');  

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        
        res.render('admin/orderView', { order });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

exports.updateOrderStatus = async (req,res)=>{
    try
    {
        const {id} = req.params;
        let {status} = req.body;

        status = status.toLowerCase()

        const order = await Order.findById(id).populate('userId');  

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        if (status === 'cancelled' && order.status !== 'cancelled') {
            let wallet = await Wallet.findOne({ user: order.userId });

            if (!wallet) {
                wallet = new Wallet({ user: order.userId, balance: 0 });
            }

            
            wallet.balance += order.totalPrice;

            await wallet.save();

            console.log(`Wallet balance updated for user ${order.userId}: $${wallet.balance}`);
        }

    await Order.findByIdAndUpdate(id,{status})

    res.status(200).json({ message: 'Order status updated successfully' });
    }catch(error){
        console.log(error)
        res.status(500).json({ error: 'Internal Server Error' });
    }
}



exports.handleReturnRequest = async (req, res) => {
    try {
        const { orderId, action } = req.body; 
        
        const order = await Order.findById(orderId);
        if (!order || !order.returnRequested) {
            return res.status(404).json({ success: false, message: 'No return request found for this order' });
        }

        if (action === 'approve') {
            order.status = 'returned';
            order.returnRequested = false;

            const wallet = await Wallet.findOne({ user: order.userId });
            const refundAmount = order.totalPrice || 0;
    
            if (!wallet) {
                const newWallet = new Wallet({
                    user: order.userId, 
                    balance: refundAmount,
                    transaction: [
                        {
                            amount: refundAmount,
                            date: new Date(),
                            type: 'credit', 
                        },
                    ],
                });
                await newWallet.save();
            } else {
                wallet.balance += refundAmount;
    
                wallet.transaction.push({
                    amount: refundAmount,
                    date: new Date(),
                    type: 'credit',
                });
                await wallet.save();
            }
    

        } else if (action === 'reject') {
            order.returnRequested = false;
        }

        await order.save();

        return res.status(200).json({ success: true, message: `Return request ${action}ed successfully` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'An error occurred' });
    }
};
