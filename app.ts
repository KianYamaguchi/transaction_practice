import express from 'express';
import path from 'path';
import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';
import session from 'express-session';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { Request, Response, NextFunction } from 'express';
const app = express();
dotenv.config();

app.set('view engine', 'ejs'); 
app.set('views', path.join(__dirname, 'views')); 
app.use(express.urlencoded({ extended: true }));
app.use(helmet());

if(!process.env.SECRET_KEY){
  throw new Error("環境変数に設定されていません。");
}
app.use(session({
  secret: process.env.SECRET_KEY,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

declare module 'express-session' {
  interface SessionData {
    userId?: number;
    error: string;
    message: string;
    // 必要なら他のプロパティも追加
  }
}

if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_PASSWORD || !process.env.DB_NAME) {
  throw new Error("環境変数に設定されていません。");
}
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
});

function sessionValidation(req: Request, res: Response, next: NextFunction){
   if (!req.session.userId){
      return res.redirect("/login");
   }
   next();
}

app.get('/register', (req, res) => {
   res.render("register" , { error: null });
});

app.post('/register', async (req, res) => {
    const {username, password, money} = req.body;
    if(!username || !password || !money) {
      return res.render("register", {error: "すべての項目を入力してください"});
    } 

   try{
   const hashedpassword = await bcrypt.hash(password, 10);
   if(!hashedpassword){
      throw Error;
   }
   await db.query(
      'INSERT INTO users (username, password, money) VALUES (?, ?, ?)',
      [username, hashedpassword, money],
    )
   }catch(e){
      console.log(e);
     return  res.render("register", {error: "ユーザー登録に失敗しました"});
   }
     res.redirect('/login');
});

app.get('/login', (req, res) => {
   res.render('login', { error: null});
});

async function getUserdata (username: string): Promise<any[]>{
const [rows] = await db.query('SELECT userId, username, password FROM users WHERE username = ? ', [username]);
return Array.isArray(rows) ? rows : [];
}

app.post('/login',async (req, res) => {
   const { username, password } = req.body;
   if(!username || !password) return;

   const rows = await getUserdata(username);
   if(!rows){
      res.render("login", { error: "ユーザ名が一致しませんでした。"})
   }
   const users = rows[0];
   const hashedPassword = users.password;

   const match = await bcrypt.compare(password, hashedPassword);
   if(match){
      req.session.userId = users.userId
      res.redirect('/home');

   } else {
      return res.render("login", { error: "パスワードが一致しませんでした。"})
   }
});

app.get('/', (req, res) => {
  res.redirect("/home");
});

app.get('/home', sessionValidation, async (req, res) => {

   const userID = req.session.userId;
   const [rows] = await db.query('SELECT userId, username, money FROM users WHERE userId = ?', [userID])
   if (!Array.isArray(rows) || rows.length === 0) return res.status(404).send("ユーザーが見つかりません");
   const users = rows[0];
   const error = req.session.error;
   req.session.error = undefined;
   const message = req.session.message;
   req.session.message = undefined;
   res.render('home' , {users, error, message});
});

app.post('/home', sessionValidation, async (req, res) => {

   const userID = req.session.userId;
   const {username, sendMoney} = req.body
   const sendMoneyNum = Number(sendMoney);

   const conn = await db.getConnection();
   try{

   await conn.beginTransaction();//トランザクション開始

   const [myRows]:any = await conn.query('SELECT money, username FROM users WHERE userId = ?', [userID]);

   const money = myRows[0].money;
   const myUsername = myRows[0].username;
   if (sendMoneyNum < 0 || Number.isInteger(sendMoneyNum) == false ){
      throw new Error("正しい金額を入力してください。")
   }
   const totalMoney = money - sendMoneyNum;
   if(myUsername == username){
      throw new Error("入力したのはあなたのユーザー名です。他のユーザーに送金してください。")
   }

   if (sendMoneyNum > money) {
         throw new Error("残高不足のためロールバックしました。金額をご確認ください。");
      }

   await conn.query('UPDATE users SET money = ? WHERE userId = ?', [totalMoney, userID])//ユーザー側の処理終わり


   const [yourRows]:any = await conn.query('SELECT money FROM users WHERE username = ?', [username]);
   if(!yourRows.length) throw new Error("相手ユーザーが見つからなかったのでロールバックしました。ユーザー名をご確認ください。")

   const yourMoney = yourRows[0].money;
   const totalYourMoney:any = yourMoney + sendMoneyNum
   await conn.query('UPDATE users SET money = ? WHERE username = ?', [totalYourMoney, username])

   await conn.commit();

   req.session.message = "トランザクションが成功しました"
   res.redirect("/home");

   } catch(e:any) {
      await conn.rollback();
      req.session.error = e.message || "予期せぬエラーが発生しました。もう一度お試しください";
      res.redirect("/home");

   }finally{
      conn.release();
   }
});


app.listen(3000, () =>{
   console.log("port3000で起動中");
});