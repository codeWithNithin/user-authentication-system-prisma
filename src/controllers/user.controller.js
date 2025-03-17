const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcrypt')

const prisma = new PrismaClient()
// use `prisma` in your application to read and write data in your DB

async function registerUser(req, res, next) {

}

module.exports = { registerUser }