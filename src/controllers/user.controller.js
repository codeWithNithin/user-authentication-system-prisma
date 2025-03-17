const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')
const sendEmail = require('../utils/sendEmail.utils')
const jwt = require('jsonwebtoken')

const prisma = new PrismaClient()
// use `prisma` in your application to read and write data in your DB

async function registerUser(req, res, next) {

  // 1. get name, email and pwd from request body
  const { name, email, password } = req.body

  // 2. check if the given data are valid
  if (!name || !email || !password) {
    res.status(400).json({
      success: false,
      message: 'Please provide all the required fields'
    })
  }

  try {
    // 3. get the user document from the email given
    const existingUser = await prisma.user.findUnique({ where: { email } })

    // 4. check if the user already exists
    if (existingUser) {
      res.status(400).json({
        success: false,
        message: 'User already exists'
      })
    }

    // 6. use bcrypt for storing password in db
    const userPassword = await bcrypt.hash(password, 10)
    // 7. create verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');

    //  8. create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: userPassword,
        verificationToken
      }
    })

    // 8. send email
    sendEmail(user.email, 'Verify your email', `Please click on the following link: ${process.env.BASE_URL}/api/v1/users/verify/${verificationToken}`)

    // 9. send response
    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: user
    })


  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    })
  }
}


async function verifyEmail(req, res, next) {
  const { token } = req.params;
  console.log('token', token)

  if (!token) {
    res.status(400).json({
      success: false,
      message: 'Invalid token'
    })
  }

  try {
    const existingUser = await prisma.user.findFirst({ where: { verificationToken: token } })

    console.log('existing', existingUser)

    if (!existingUser) {
      res.status(400).json({
        success: false,
        message: 'Invalid token'
      })
    }


    const updatedUser = await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        isVerified: true,
        verificationToken: null
      }
    })

    console.log('updated', updatedUser)

    res.status(200).json({
      success: true,
      message: 'Email verified successfully',
      data: updatedUser
    })

  } catch (err) {

  }

}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      })
    }

    const user = await prisma.user.findFirst({ where: { email } })

    console.log('user', user)

    if (!user) {
      res.status(400).json({
        success: false,
        message: 'Invalid email or password'
      })
    }

    const isMatch = await bcrypt.compare(password, user.password);

    console.log('isMatch', isMatch)

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email or password'
      })
    }

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '24h' })

    res.cookie('token', token, {
      httpOnly: true,
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000)
    })


    res.status(200).json({
      success: true,
      message: 'User logged in successfully',
      data: {
        token,
        user
      }
    })




  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    })
  }
}


async function getLoggedInUser(req, res, next) {
  try {
    // const user = await User.findById(req.user.id).select('-password');
    const user = await prisma.user.findFirst({
      where: { id: req.user.id },
      select: {
        name: true,
        email: true,
        role: true,
        id: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true
      }
    })

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'User does not exist!!!'
      })
    }

    res.status(200).json({
      success: true,
      message: 'current user details fetched sucessfully',
      data: user
    })
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    })
  }

}


async function logout(req, res, next) {
  res.cookie('token', null, {
    expires: new Date(0)
  })
  res.status(200).json({
    success: true,
    message: 'User logged out successfully'
  })
}


async function forgotPassword(req, res, next) {
  // 1. first get email from req
  const { email } = req.body
  // 2. validate the incoming email
  if (!email) {
    return res.status(400).json({
      success: false,
      message: 'Please provide valid email'
    })
  }
  // 3. check if user exists with this email
  const user = await prisma.user.findUnique({ where: { email } })

  // 4. if user does not exist, return error
  if (!user) {
    return res.status(400).json({
      success: false,
      message: 'User does not exist'
    })
  }

  // 5.if user exists
  //  1. generate reset password token
  const restPwdToken = crypto.randomBytes(32).toString('hex');
  //  2. provide reset expiry as well
  const resetPwdExpiry = Date.now() + 10 * 60 * 1000; // 10 mins validity

  // 6. update the user table
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordResetToken: restPwdToken,
      passwordResetExpiry: resetPwdExpiry.toString()
    }
  })

  //  3. send email to user
  sendEmail(email, 'Reset your password', `Please click on the following link to reset your password: ${process.env.BASE_URL}/api/v1/users/reset-password/${restPwdToken}`)

  res.status(200).json({
    success: true,
    message: `An Email has been shared to the registered email ${email}`,
    data: {
      token: restPwdToken
    }
  })
}

async function resetPassword(req, res, next) {
  try {
    // 1. get token from req.params
    const { token } = req.params;
    // 2. get password and confirmPassword from req.body
    const { password, confirmPassword } = req.body;
    // 3. validate token and passwords
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Please provide valid token'
      })
    }

    if (!password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide valdi passwords'
      })
    }


    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match'
      })
    }

    const user = await prisma.user.findUnique({ where: { passwordResetToken: token, passwordResetExpiry: { gt: Date.now().toString() } } })

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid token'
      })
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: null,
        passwordResetExpiry: null,
        password
      }
    })

    res.status(200).json({
      success: true,
      message: 'Password reset successfully',
      data: updatedUser
    })


  } catch (err) {

  }
}

module.exports = { registerUser, verifyEmail, login, getLoggedInUser, logout, forgotPassword, resetPassword }