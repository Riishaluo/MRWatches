const Category = require('../model/categoryModel'); 

// render the admin category page
exports.renderAdminCategoryPage = async (req, res) => {
    try {
        const categories = await Category.find()
        res.render('admin/category',{categories}); 
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal server error.');
    }
};

exports.addCategoryPage = (req, res) => {
    res.render('admin/addCategory', { 
        category: null,
        error : null,
    });
};

exports.addCategory = async (req, res) => {
    try {
        const { name } = req.body;
        const existingCategory = await Category.findOne({ name: { $regex: new RegExp('^' + name + '$', 'i') } });
        
        if (existingCategory) {
            return res.render('admin/addCategory', {
                error: 'Category already exists', 
                category: null,
            });
        }

        const newCategory = new Category({ name });
        await newCategory.save();
        res.redirect('/admin/category');
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};


exports.editCategoryPage = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) {
            return res.status(404).send('Category not found');
        }
        res.render('admin/editCategory', { category, error: null });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal server error.');
    }
};



exports.editCategory = async (req, res) => {
    const { name } = req.body; 
    const categoryId = req.params.id; 

    try {
        const existingCategory = await Category.findOne({
            name: { $regex: `^${name}$`, $options: 'i' }, 
            _id: { $ne: categoryId } 
        });

        if (existingCategory) {
            return res.render('admin/addCategory', {
                error: 'Category already exists',
                category: { _id: categoryId, name }, 
            });
        }

        await Category.findByIdAndUpdate(categoryId, { name });
    

        res.redirect('/admin/category');
    } catch (error) {
        console.error('Error updating category:', error);
        res.status(500).send('Error updating category'); 
    }
};



// Toggle listing category

exports.toggleListing = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) {
            return res.status(404).send('Category not found');
        }
        category.isListed = !category.isListed; 
        await category.save();
        res.redirect('/admin/category');
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};


