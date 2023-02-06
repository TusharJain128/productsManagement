const cartModel = require("../model/cartModel")
const productModel = require("../model/productModel")



const createCart = async (req, res) => {

    try {
        let userId = req.params.userId
        let data = req.body
        let { cartId, productId } = data
        if (cartId) {
            let checkCart = await cartModel.findById(cartId).lean()
            if (!checkCart) res.status(404).send({ status: false, message: "cart is not exist,Please create new Cart" })
            let totalPrice = checkCart.totalPrice

            let productData = await productModel.findOne({ _id: productId, isDeleted: false })
            if (!productData) res.status(404).send({ status: false, message: "product is not exist" })

            let quantity = 1
            for (let i = 0; i < checkCart.totalItems; i++) {
                if (checkCart.items[i].productId == productId) {
                    quantity = checkCart.items[i].quantity = checkCart.items[i].quantity + 1
                }
            }

            totalPrice += productData.price

            if (quantity == 1) {
                let newItem = {
                    productId: productId,
                    quantity: quantity
                }
                checkCart.items.push(newItem)
            }
            let updatedCart = {
                items: checkCart.items,
                totalPrice: totalPrice,
                totalItems: checkCart.items.length
            }
            let createCart = await cartModel.findByIdAndUpdate(checkCart._id, { $set: updatedCart }, { new: true })
            res.status(201).send({ status: true, message: "Success", data: createCart })
        }
        else {
            let productData = await productModel.findOne({ _id: productId, isDeleted: false })
            if (!productData) return res.status(404).send({ status: false, message: "product not found" })


            let newCart = {
                userId: userId,
                items: [{
                    productId: productId,
                    quantity: 1
                }],
                totalPrice: productData.price,
                totalItems: 1
            }
            let createCart = await cartModel.create(newCart)
            res.status(201).send({ status: true, message: "Success", data: createCart })
        }
    } catch (err) {
        res.status(500).send({ Status: false, messgae: err.message })

    }
}

//=============================get cart==================================
const getCart = async (req, res) => {
    try {
        let userId = req.params.userId;

        let userData = await userModel.findById(userId);
        if (!userData) {
            return res.status(404).send({ status: false, message: `User does not exist` });
        }
        if (req.userId != userData._id) {
            return res.status(403).send({ status: false, message: "You are not authorize to see other's cart" });
        }

        let cartData = await cartModel.findOne({ userId }).populate('items.productId', { _id: 0, title: 1, description: 1, price: 1, productImage: 1, style: 1 });
        if (!cartData) {
            return res.status(404).send({ status: false, message: `You haven't added any products to your cart` });
        }
        res.status(200).send({ status: true, message: 'Success', data: cartData });
    }
    catch (err) {
        res.status(500).send({ status: false, message: err.message });
    }
}

//===============================update cart============================
const updateCart = async (req, res) => {
    let data = req.body
    if (!data) return res.status(400).send({ status: false, message: "Please put some data" })
    let { cartId, productId, removeProduct } = data
    if (!cartId) {
        let userId = req.params.userId
        let getCartId = await cartModel.findOne({ userId: userId })
        cartId = getCartId._id
    }
    let getCartId = await cartModel.findById(cartId).lean()
    if (removeProduct == 0) {
        let removedItem
        for (let i = 0; i < getCartId.totalItems; i++) {
            if (getCartId.items[i].productId == productId) {
                if ((removeProduct == 0) || (removeProduct == 1 && getCartId.items[i].quantity == 1)) {
                    removedItem = getCartId.items.splice(i, 1)
                    break;
                }
                if (removeProduct == 1 && getCartId.items[i].quantity > 1) {
                    getCartId.items[i].quantity = getCartId.items[i].quantity - 1
                    removedItem = getCartId.items[i]
                    break;
                }
            }
        }
        if (!removedItem) return res.status(404).send({ status: false, message: "Product is not present in cart" })

        let deletedProduct = await productModel.findById(removedItem.productId)
        if (!deletedProduct) return res.status(404).send({ status: false, message: "Product is not found in database" })

        let totalPrice = getCartId.totalPrice - (deletedProduct.price * removedItem.quantity)
        let totalItems = getCartId.items.length

        let updatedCart = await cartModel.findByIdAndUpdate(
            getCartId._id,
            {
                items: getCartId.items,
                totalPrice: totalPrice,
                totalItems: totalItems
            },
            { new: true }
        )

        res.status(200).send({ status: true, message: updatedCart })

    }
}

//==================================delete cart==============================
const deleteCart = async (req, res) => {
    try {
        let userId = req.params.userId;

        let userData = await userModel.findById(userId);
        if (!userData) {
            return res.status(404).send({ status: false, message: `User does not exist` });
        }
        if (req.userId != userId) {
            return res.status(403).send({ status: false, message: 'You are not authorize to delete another cart' });
        }

        let cartData = await cartModel.findOne({ userId });
        if (!cartData) {
            return res.status(404).send({ status: false, message: 'Cart does not exist' });
        }
        await cartModel.findOneAndUpdate({ userId }, { items: [], totalPrice: 0, totalItems: 0 });
        res.status(204).send();
    }
    catch (err) {
        res.status(500).send({ status: false, message: err.message });
    }
}


module.exports = { createCart, getCart, updateCart, deleteCart }

