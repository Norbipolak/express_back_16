import express from "express";
import expressEjsLayouts from "express-ejs-layouts";
import UserHandler from "./app/userHandler,js"; 
import session from "express-session"
import successHTTP from "./app/successHTTP.js";
import Addresses from "./app/Addresses.js";
import getMessageAndSuccess from "./app/getMessageAndSuccess.js";
import checkPermission from "./app/checkPermission.js";
import checkAdminPermission from "./app/checkAdminPermission.js";
import ProductCategories from "./app/ProductCategories.js";
import nullOrUndefined from "./app/nullOrUndefined.js";
import fs from "fs";

const app = express();

app.set("view engine", "ejs");
app.use(expressEjsLayouts);
app.use(urlencoded({extended: true}));
app.use(express.static("assets"));
app.use(express.static("product-images"));

app.use(session());

app.use(session({
    secret: "asdf",
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        maxAge: 24*60*60*1000
    }
}));

const uh = new UserHandler();
const p = new Profile(); 
const a = new Addresses();
const pc = new ProductCategories();
const pr = new Products();

app.get("/", (req, res)=> {
    res.render("public/index", 
        {
            layout: "layouts/public_layout", 
            title: "Kezdőlap", 
            baseUrl: process.env.BASE_URL,
            page:"index",
            message:req.query.message ? req.query.message : "",
            loggedIn: nullOrUndefined(req.session.isAdmin) ? -1 : req.session.isAdmin
        }
    );
});

app.get("/regisztracio", (req, res)=> {
    res.render("public/register", {
        layout:"./layouts/public_layout",
        title:"Regisztráció", 
        baseUrl: process.env.BASE_URL,
        page:"regisztracio",
        loggedIn: nullOrUndefined(req.session.isAdmin) ? -1 : req.session.isAdmin
    })
})

app.post("/regisztracio", async (req, res)=> {
    let response;
    try {
        response = await uh.register(req.body); 
    } catch (err) {
        response = err;
    }

    //response.success = response.status.toString(0) === "2";
    response.success = successHTTP(response.status);
    res.status(response.status);

    res.render("public/register_post", {
        layout: "./layout/public_layout",
        message: response.message,
        title: "Regisztráció",
        baseUrl: process.env.BASE_URL,
        page: "regisztracio", 
        success: response.success
    })
});

app.post("/login", async (req, res)=> {
    let response;
    let path;

    try{
        response = uh.login(req.body);
        req.session.userName = response.message.userName;
        req.session.userID = response.message.userID;
        req.session.isAdmin = response.message.isAdmin;

        path = response.message.isAdmin == 0 ? "/user/profil" : "/admin/profil"
    } catch(err) {
        response = err;
    }

    response.success = successHTTP(response.status);


    res.status(response.status).redirect(
        response.success ? path : `/bejelentkezes?message=${response.message[0]}`
    )

})

app.get("/bejelentkezes", (req, res)=> {
    res.render("public/login", {
        layout: "./layouts/public_layout",
        title: "Bejelentkezés",
        baseUrl: process.env.BASE_URL,
        page: "bejelentkezes",
        message: req.query.message ? req.query.message : "",
        loggedIn: nullOrUndefined(req.session.isAdmin) ? -1 : req.session.isAdmin
    })
});

app.get("/user/profil", async (req, res)=> {
    try {
        checkPermission(req.session.userID);
        const profileData = await p.getProfile(req.session.userID);
        //const messages = req.query.messages.split(",");
        /*
            Mert a getProfile függvény vár egy id-t és az alapján lehozza az összes (*) adatot, ahhoz az id-ű rekordhoz 
        */
        //csináltunk egy segédfüggvényt
        const messageAndSuccess = getMessageAndSuccess(req.query);
        
        res.render("user/profile", {
            layout: "./layouts/user_layout",
            title: "Profil Szerkesztése",
            baseUrl: process.env.BASE_URL,
            profileData: profileData.message, //itt meg megszerezzük az összes mezőt az adatbázisból 
            page: "profil", 
            message: messageAndSuccess.message,
            success: messageAndSuccess.success
        })
    } catch(err) {
        res.redirect(`/?message=${err.message}`);
    }   
});

app.post("/user/profil", async (req, res)=> {
    let response;

    try {
        const user = req.body;
        user.userID = req.session.userID;
        response = await p.updateProfile(user);
    } catch(err) {
        response = err;
    }

    console.log(response);

        
    const success = successHTTP(response.status);
    res.redirect(`/user/profil?success=${success}&messages=${response.message}`);
});

app.get("/user/cim-letrehozasa", async (req, res)=> {
    try {
        checkPermission(req.session.userID);
        const addressTypes = await a.getAddressTypes();
        const messageAndSuccess = getMessageAndSuccess(req.query);
    
        res.render("user/create_address", {
            layout: "./layouts/user_layout", 
            title: "Címek létrehozása", 
            page: "címek",
            addressTypes: addressTypes,
            baseUrl: process.env.BASE_URL,
            message: messageAndSuccess.message,
            success: messageAndSuccess.success,
            address:{}
        })
    } catch(err) {
        res.redirect(`/?message=${err.message}`);
    } 
   
});

app.post("/user/create_address", async (req, res)=> {
    //itt szedjük majd le az adatokat 
    let response;

    try {
        response = await a.createAddress(req.body, req.session.userID);
    } catch(err) {
        response = err;
    }

    const success = successHTTP(response.status);

    if(success) {
        res.status(response.status).redirect(`/user/cim-letrehozasa/${response.insertID}?message=${response.message}&success=${success}`);
    } else {
        res.status(response.status).redirect(`/user/cim-letrehozasa?message=${response.message}&success=${success}`);
    }
    
});

app.get("/user/cim-letrehozasa:addressID", async (req, res)=> {
    try {
        checkPermission(req.session.userID);
        const addressTypes = await a.getAddressTypes();
        const messageAndSuccess = getMessageAndSuccess(req.query);
        const address = await a.getAddressByID(req.params.addressID, req.session.userID);
        console.log(address);
    
        res.render("user/create_address", {
            layout: "./layouts/user_layout", 
            title: "Címek létrehozása", 
            baseUrl: process.env.BASE_URL,
            page: "címek",
            addressTypes: addressTypes,
            message: messageAndSuccess.message,
            success: messageAndSuccess.success,
            address:address
        })
    } catch(err) {
        res.redirect(`/?message=${err.message}`);
    } 
});

app.get("/user/címek", async (req, res)=> {
    let response;

    try {
        checkPermission(req.session.userID),
        response = await a.getAddressesByUser(req.session.userID);
    } catch(err) {
        if(err.status === 403) {
            res.redirect(`/message=${err.message}`);
        }
        response = err;
    }

    res.render("user/addresses", { 
        layout: ".layout/user_layout",
        addresses: response.message,
        baseUrl: process.env.BASE_URL,
        title: "Címek", 
        page: "címek"
    })
});

app.post("user/create-address/:addressID", async (req, res)=> {
    let response;

    try {
        const address = req.body;
        address.addressID = req.params.addressID;
        response = await a.updateAddress(address, req.session.userID);
    } catch(err) {
        response = err;
    }

    const success = successHTTP(response.success);
    res.redirect(`/user/cim-letrehozasa/${req.params.addressID}?message=${response.message}&success=${success}`);
    /*
        fontos, hogy azokat ami egy url változó query, azt ?xx=xx formátumba kell csinálni   
    */
})

app.get("/admin/profil", async (req, res)=> {
    try {
        checkAdminPermission(
            req.session.userID,
            req.session.isAdmin
        );
        const profileData = await p.getProfile(req.session.userID);
        const messageAndSuccess = getMessageAndSuccess(req.query);
        
        res.render("admin/profile", {
            layout: "./layouts/admin_layout",
            title: "Profil Szerkesztése",
            baseUrl: process.env.BASE_URL,
            profileData: profileData.message, //itt meg megszerezzük az összes mezőt az adatbázisból 
            page: "profil", 
            message: messageAndSuccess.message,
            success: messageAndSuccess.success
        })
    } catch(err) {
        res.redirect(`/?message=${err.message}`);
    }   
});

app.get("/admin/felhasznalok", async (req, res)=> {
    try {
        checkAdminPermission(
            req.session.userID,
            req.session.isAdmin
        );

        const users = await uh.search(
            req.session.userID,
            req.session.isAdmin
        )
        
        res.render("admin/users", {
            layout: "./layouts/admin_layout",
            title: "Felhasználok",
            baseUrl: process.env.BASE_URL,
            profileData: users.message,
            page: "felhasznalok", 
        })
    } catch(err) {
        res.redirect(`/?message=${err.message}`);
    }   
});

app.get("/admin/termek-kategoriak", async (req, res)=> {
    try {
        // checkAdminPermission(
        //     req.session.userID,
        //     req.session.isAdmin
        // );

        const categories = await pc.getProductCategories(
            // req.session.userID,
            // req.session.isAdmin
        )
        
        res.render("admin/product-categories", {
            layout: "./layouts/admin_layout",
            title: "Termék kategóriák",
            baseUrl: process.env.BASE_URL,
            categories: categories,
            page: "termek-kategoriak"
        })
    } catch(err) {
        res.redirect(`/?message=${err.message}`);
    }   
});

app.get("/admin/termek-kategoria", async (req, res)=> {
    try {
        checkAdminPermission(
            req.session.userID,
            req.session.isAdmin
        );

        const messageAndSuccess = getMessageAndSuccess(req.query);
        
        res.render("admin/product-category", {
            layout: "./layouts/admin_layout",
            title: "Termék kategória",
            baseUrl: process.env.BASE_URL,
            page: "termek-kategoria", 
            categoryData: null,
            message: messageAndSuccess.message,
            success: messageAndSuccess.success
        })
    } catch(err) {
        res.redirect(`/?message=${err.message}`);
    }   
});

app.post("admin/create-category", async (req, res)=> {
    let response;

    try {
        response = await pc.createCategory(
            req.body,
            req.session.userID,
            req.session.isAdmin
        )
    } catch(err) {
        response = err;
    }

    const success = successHTTP(response.success);
    if(success) {
        res.redirect(`/admin/termek-kategoria/${response.insertID}?message=${response.message}&success=${success}`);
    } else {
        res.redirect(`/admin/termek-kategoria/?message=${response.message}&success=${success}`);
    }
});

app.get("/admin/termek-kategoria/:categoryID", async (req, res)=> {
    try {
        checkAdminPermission(
            req.session.userID,
            req.session.isAdmin
        );

        const categoryData = await pc.getCategoryByID(req.params.categoryID);
        /*
            fontos, hogy itt ha response [0][0], akkor azt az egyet kapjuk meg, ami nekünk kell 
            async getCategoryByID(categoryID) {
                 try {
                    const response = await conn.promise().query(
                    "SELECT * FROM product_categories WHERE categoryID = ?"
                    [categoryID]
                    );
                return response[0][0];                        *****
        */

        const messageAndSuccess = getMessageAndSuccess(req.query);
        
        res.render("admin/product-category", {
            layout: "./layouts/admin_layout",
            title: "Termék kategória",
            baseUrl: process.env.BASE_URL,
            page: "termek-kategoria", 
            categoryData:categoryData, 
            message: messageAndSuccess.message,
            success: messageAndSuccess.success
        })
    } catch(err) {
        res.redirect(`/?message=${err.message}`);
    }   
});

app.post("admin/create-category/:categoryID", async (req, res)=> {
    let response;

    try {

        const categoryData = req.body;
        categoryData.categoryID = req.params.categoryID;
        response = await pc.updateCategory(
            categoryData,
            req.session.userID,
            req.session.isAdmin
        )
    } catch(err) {
        response = err;
    }

    const success = successHTTP(response.success);
    // if(success) {
    //     res.redirect(`/admin/termek-kategoria/${response.insertID}?message=${response.message}&success=${success}`);
    // } else {
    //     res.redirect(`/admin/termek-kategoria/?message=${response.message}&success=${success}`);
    // }
    //itt nem úgy fogunk eljárni, mert nem response.insertID, hanem req.params.category, ahonnan meg van a szám!! 

    res.redirect(`/admin/termek-kategoria/${req.params.categoryID}/?message=${response.message}&success=${success}`);
});

app.post("/admin/delete-category/:categoryID", async (req, res)=> {
    let response;

    try {
        response = await pc.deleteCategory(
            req.params.categoryID,
            req.session.userID,
            req.session.isAdmin
        );
    } catch(err) {
        response = err;
    }

    const success = successHTTP(response.success);
    res.redirect(`/admin/termek-kategoriak/?message=${response.message}&success=${success}`);
});

//fontos, hogy nincsen még példányunk a Product-ból -> const pr = new Products();
app.get("/admin/termek", async (req, res)=> {
    try {
        checkAdminPermission(
            req.session.userID,
            req.session.isAdmin
        );
    
        /*
            Itt nekünk kell a productCategory
            Ez nagyon fontos, mert ha nincs itt productCategory, akkor nem tudjuk kiválasztani a termék kategóriákat, ilyen legördülősben 
            -> 
        */
        const categories = await pc.getProductCategories()
        /*
            majd amit itt megkapunk termék kategóriákat, azokat át kell adni a render-nek, mert ott majd egy forEach-vel végig kell menni rajtuk!!
        */
        const messageAndSuccess = getMessageAndSuccess(req.query);
        
        res.render("admin/product", {
            layout: "./layouts/admin_layout",
            title: "Termék létrehozása",
            baseUrl: process.env.BASE_URL,
            page: "termek", 
            categories: categories,           //***
            message: messageAndSuccess.message,
            success: messageAndSuccess.success,
            productData: null         
        })
    } catch(err) {
        console.log(err);
        res.redirect(`/?message=${err.message}`);
    }
});

app.post("/admin/create-product", async (req, res)=> {
    let response;

    try {
        response = await pr.createProduct(
            req.body,
            req.session.userID,
            req.session.isAdmin
        );
    } catch(err) {
        response = err;
    }

    const success = successHTTP(response.success);
    if(success) {
        res.redirect(`/admin/termek/${response.insertID}?message=${response.message}&success=${success}`);
    } else {
        res.redirect(`/admin/termek?message=${response.message}&success=${success}`);
    }
});

app.get("/admin/termek/:productID", async (req, res)=> {
    try {
        checkAdminPermission(
            req.session.userID,
            req.session.isAdmin
        );

        const categories = await pc.getProductCategories()
        const messageAndSuccess = getMessageAndSuccess(req.query);
        const productData = await pr.getProductByID(req.params.productID);

        res.render("admin/product", {
            layout: "./layouts/admin_layout",
            title: "Termék létrehozása",
            baseUrl: process.env.BASE_URL,
            page: "termek", 
            categories: categories, 
            message: messageAndSuccess.message,
            success: messageAndSuccess.success, 
            productData: productData          
        })
    } catch(err) {
        console.log(err);
        res.redirect(`/?message=${err.message}`);
    }
});

app.post("/admin/create-product/:productID", async (req, res)=> {
    let response;

    try {
        req.body.productID = req.params.productID;
        //hogy a body-ban legyen benne a productID is! 
        response = await pr.updateProduct(
            req.body,
            req.session.userID,
            req.session.isAdmin
        );
    } catch(err) {
        response = err;
    }

    const success = successHTTP(response.success);
    res.redirect(`/admin/termek/${req.params.productID}?message=${response.message}&success=${success}`);
});

app.get("/admin/termekek", async (req, res)=> {
    try {
        checkAdminPermission(
            req.session.userID,
            req.session.isAdmin
        );
    
        const page = req.query.page ? parseInt(req.query.page) : 1;
        const products = await pr.getProducts(page);
        const messageAndSuccess = getMessageAndSuccess(req.query);
        
        res.render("admin/products", {
            layout: "./layouts/admin_layout",
            title: "Termékek",
            baseUrl: process.env.BASE_URL,
            page: "termekek",            
            message: messageAndSuccess.message,
            success: messageAndSuccess.success,
            products: products,
            page:page
        })
    } catch(err) {
        console.log(err);
        res.redirect(`/?message=${err.message}`);
    }
});

app.post("/admin-upload-product-image/:productID", async (req, res) => {
    const form = formidable({allowEmptyFiles: true, minFileSize:0});
    let fields;
    let files;

    form.uploadDir = "./product-images";
    form.keepExtension = true;

    try {
        [fields, files] = await form.parse(req);
        if(files.productImage[0].size === 0) {
            throw {
                status: 400,
                message: ["Nem csatoltál fájlt a kéréshez!"]
            }
        }

        await pr.deleteProductImage(
            req.params.productID, 
            req.session.userID, 
            req.session.isAdmin
        );

        const oldPath = files.productImage[0].filepath;
        const newPath = form.uploadDir + "/" + files.productImage[0].originalFileName;

        
        await fs.promises.rename(oldPath, newPath);


        await pr.updateFilePath(
            req.params.productID, 
            files.productImage[0].originalFileName, 
            req.session.userID, req.session.isAdmin
        );


        res.redirect(`/admin/termekek/${req.params.productID}`);

    } catch(err) {
        console.log(err);
        const message = err.message || ["A fájl feltöltése sikertelen!"];
        
        res.status(err.status || 400).redirect(`/admin/termekek/${req.params.productID}?message=${message}&success=false`);
    }
});

app.post("/admin/delete-product-image/:productID", async (req, res) => {

    try {
        const deleteMsg = await pr.deleteProductImage(req.params.productID, req.session.userID, req.session.isAdmin, true);

        await pr.updateFilePath
        (
            req.params.productID, 
            null, 
            req.session.userID, 
            req.session.isAdmin
        );

        const msg = deleteMsg || ["Sikeres feltöltés!"];

        res.redirect(`/admin/termek/${req.params.productID}?message=${msg}&success=true`);

    } catch (err) {
        res.status(err.status).redirect(`/admin/termek/${req.params.productID}?message=${err.message}&success=false`);
    }
});

app.get("/logout", (req, res)=> {
    req.session.userID = null;
    req.session.isAdmin = null;

    res.redirect("/");
});

app.get("/termekek", async (req, res)=> {
    try {
        // checkAdminPermission(
        //     req.session.userID,
        //     req.session.isAdmin
        // ); 
    
        const page = req.query.page ? parseInt(req.query.page) : 1;
        const products = await pr.getProducts(page);
        const messageAndSuccess = getMessageAndSuccess(req.query);
        
        //res.render("admin/products", { itt majd public mappából jelenítjük meg a products.ejs-ünket 
        res.render("public/products", {
            //layout: "./layouts/admin_layout",
            layout: "./layouts/public_layout",
            title: "Termékek",
            baseUrl: process.env.BASE_URL,
            page: "termekek",            
            message: messageAndSuccess.message,
            success: messageAndSuccess.success,
            products: products,
            page:page,
            // loggedIn-et majd itt meg kell adni, mert ez várja a public_layout 
            loggedIn: nullOrUndefined(req.session.isAdmin) ? -1 : req.session.isAdmin

        })
    } catch(err) {
        console.log(err);
        res.redirect(`/?message=${err.message}`);
    }
});

app.get("/termek/:productID", async (req,res)=> {
    try {
        // checkAdminPermission(
        //     req.session.userID,
        //     req.session.isAdmin
        // );

        //const categories = await pc.getProductCategories()
        const messageAndSuccess = getMessageAndSuccess(req.query);
        const productData = await pr.getProductByID(req.params.productID);

        //res.render("admin/product", {
        res.render("public/product", {
            //layout: "./layouts/admin_layout",
            layout: "./layouts/public_layout",
            title: "Termékadatok",
            baseUrl: process.env.BASE_URL,
            page: "termekadatok", 
            //categories: categories, categories nem kell, mert egy lekérdezésben leszedtük egy inner join-van a categoryName-ket!! 
            message: messageAndSuccess.message,
            success: messageAndSuccess.success, 
            productData: productData, 
            loggedIn: nullOrUndefined(req.session.isAdmin) ? -1 : req.session.isAdmin
        })
    } catch(err) {
        console.log(err);
        res.redirect(`/?message=${err.message}`);
    }
});


app.listen(3000, console.log("the app is listening on localhost:3000"));

/*
    Minden meg van a termékekkel kapcsolatban 
    Megoldjuk a kijelentkezést -> van ez a localhost:3000/logout 

app.get("/logout", (req, res)=> {
    req.session.userID = null;
    req.session.isAdmin = null;

    res.redirect("/");
});

Tehát kitöröltünk mindent, ami session-ben van és azokat használtuk egy, hogy tudjuk, hogy be vagyunk-e jelentkezve és csak, akkor érhetjük el az 
URL-t 
checkAdminPermission(userID, isAdmin);
-> 
function checkAdminPermission(userID, isAdmin) {
    if(nullOrUndefined(userID) || nullOrUndefined(isAdmin) || isAdmin == 0) {
        throw {
            status: 403,
            message: "Jelentkezz be a tartalom megtekintéséhez!"
        }
    }
}

És ilyenkor ha kijelenkeztük és megpróbáljuk beírni és kivitt minket a fóoldalra (a redirect miatt) localhost:3000-ra
be próbáljuk írni a keresőbe, hogy localhost:3000/admin/termek/2 
Akkor ezt fog megjelenni mind az URL-ben, mind kiírva a képernyőre, hogy 
localhost:3000/?message=Jelentkezz%20be%20a%20tartalom%20megtekintéséhez!

Ez itt a homepage 
Jelentkezz be a tartalom megtekintéséhez 

Ha meg bejelentkezünk, akkor megjeleníti azt, hogy localhost:3000/admin/termek/2 

Ennyi az egész, így töröljük ki ezeket a sessionőket ->  req.session.userID = null; req.session.isAdmin = null;
és mivel nincsenek meg ezek a session-ök, így nem férhetünk hozzá a védett tartalomhoz 

*********
Amit meg kell csinálni, hogy bejelentkezünk és kijövünk a home-ra, akkor nem azt kellene látnunk, hogy 
Kezdőlap    Regisztráció     Bejelentkezés 
Hanem azt, hogy Profil, mert már be vagyunk jelentkezve és minek regisztrálnánk meg jelentkeznénk be mégegyszer 
Az views-ban van a public-layout, ahol ilyen a nav menünk 
-> 
    <nav>
        <ul>
            <li class="<%=page === 'index' ? 'selected-menu' : '' %>">
                <a href="/">Kezdőlap</a>
            </li>
            <li class="<%=page === 'regisztracio' ? 'selected-menu' : '' %>">
                <a href="/regisztracio">Regisztráció</a>
            </li>
            <li class="<%=page === 'bejelentkezes' ? 'selected-menu' : '' %>">
                <a href="/bejelentkezes">Bejelentkezés</a>
            </li>
        </ul>
    </nav>

    itt az index-en van nekünk a 3 get-es kérés, amiben megjelenítjük ezeket az oldalakat, hogy / (kezdőlap), regisztráció, bejelentkezés 
    mindegyiknél a render-nél átadtunk egy ilyet, hogy 
    loggedIn:nullOrUndefined(req.session.userID)
        Ez azt vizsgálja meg, hogy be vagyunk-e jelentkezve, a req.session.userID az nem null vagy undefined
    
    function nullOrUndefined(data) {
        return data === null || data === undefined 
    }

app.get("/", (req, res)=> {
    res.render("public/index", 
        {
            layout: "layouts/public_layout", 
            title: "Kezdőlap", 
            baseUrl: process.env.BASE_URL,
            page:"index",
            message:req.query.message ? req.query.message : "",
            //loggedIn:nullOrUndefined(req.session.userID)         *************************
        }
    );
});

app.get("/regisztracio", (req, res)=> {
    res.render("public/register", {
        layout:"./layouts/public_layout",
        title:"Regisztráció", 
        baseUrl: process.env.BASE_URL,
        page:"regisztracio",
        //loggedIn:nullOrUndefined(req.session.userID);      **************************
    })
})

app.get("/bejelentkezes", (req, res)=> {
    res.render("public/login", {
        layout: "./layouts/public_layout",
        title: "Bejelentkezés",
        baseUrl: process.env.BASE_URL,
        page: "bejelentkezes",
        message: req.query.message ? req.query.message : "",
        //loggedIn:req.nullOrUndefined(req.session.userID)      ***************************
    })
});

De csak azt kellene tudni, hogy be van-e jelentkezve, hanem azt is, hogy mi a userType (isAdmin)
és inkább azt mindjuk ehelyett, hogy loggedIn:req.nullOrUndefined(req.session.userID)
-> 
loggedIn: nullOrUndefined(req.session.isAdmin) ? -1 : req.session.isAdmin
Kétféle isAdmin-unk van 0  (user) és 1 (admin) 
nullOrUndefined(req.session.isAdmin) az null vagy undefined, akkor -1 lesz, mert akkor tudjuk, hogy nem vagyunk bejelentkezve, 
ha meg igen, akkor attól függően, hogy user vagy admin van bejelentkezve 0 vagy 1 

És az public.layout.ejs-en ha ezek -1-ek, akkor megjelennek, tehát be kell jelentkezni vagy regisztrálni ha meg nem -1, 
akkor ezek nem fognak megjelenni, mert tudjuk, hogy be van jelentkezve, hiszen az isAdmin az 0 vagy 1 
->
<body>
    <nav>
        <ul>
            <li class="<%=page === 'index' ? 'selected-menu' : '' %>">
                <a href="/">Kezdőlap</a>
            </li>
            <% if(loggedIn == -1)  { %>         ************************************
                <li class="<%=page === 'regisztracio' ? 'selected-menu' : '' %>">
                    <a href="/regisztracio">Regisztráció</a>
                </li>
                <li class="<%=page === 'bejelentkezes' ? 'selected-menu' : '' %>">
                    <a href="/bejelentkezes">Bejelentkezés</a>
                </li>
            <% } else if(loggedIn == 1) { %>  ****************************
                <li>
                    <a href="/admin/profil">Profil</a>
                </li>
            <% }  else { %>  ****************************
                <li>
                    <a href="/admin/profil">Profil</a>
                </li>
            <% } %>
        </ul>
    </nav>

    Tehét ha if(loggedIn == -1), akkor tudjuk, hogy nem vagyunk bejelentkezve és megjelenítjük azt ami eddig meg volt (regisztracio, bejelentkezes)
            <% if(loggedIn == -1)  { %>         ************************************
                <li class="<%=page === 'regisztracio' ? 'selected-menu' : '' %>">
                    <a href="/regisztracio">Regisztráció</a>
                </li>
                <li class="<%=page === 'bejelentkezes' ? 'selected-menu' : '' %>">
                    <a href="/bejelentkezes">Bejelentkezés</a>
                </li>

    Utána jön egy else if <% } else if(loggedIn == 1) 
    Ha az isAdmin 1, akkor tudjuk, hogy be van jelentkezve és admin felhasználóról van szó és ezért itt megjelenítjük neki a admin/profil-t 
        <% } else if(loggedIn == 1) { %>  ****************************
            <li>
                <a href="/admin/profil">Profil</a>
            </li>

    else ág, vagy lehettet volna egy ilyen else if is, hogy else if(loggedIn == 0) 
    A harmadik eshetőség az csak egy else lesz, mert akkor tudjuk, hogy be van jelentkezve, mert nem -1 és azt is, hogy nem admin, mert 0 
    lesz az értéke a loggedIn-nek, ezért megjelenítjük itt az user/profil-t 

        <% }  else { %>  ****************************
            <li>
                <a href="/admin/profil">Profil</a>
        </li>

    És akkor most van egy olyan menüpont, hogy kezdőlap meg egy olyan is, hogy profil, de lesznek még itt menüpontok 
    Lesz egy olyan, hogy termékek 

    <li>
        <a href="/termekek">Termékek</a>
    </li>

    és fontos, hogy most a public-on vagyunk, tehát nem az lesz, hogy admin vagy user/termekek 
    hanem simán termekek -> <a href="/termekek">Termékek</a>
    És ennek meg is kell majd csinálni az endpoint-ját -> localhost:3000/termekek

    app.get("termekek", (req, res)=> {
    
    });

    És itt, amit majd meg akarunk jeleníteni azt a public mappába csináljuk -> products.ejs 
    Ez nagyon hasonló lesz majd az adminban lávő products.ejs-re 
    Csak egy kicsit más lesz, mert itt pl. majd nem tudják letörölni a termékeket, tehát ez nem lesz majd benne 
    ->
        <form method="post" action="<%= baseUrl%>/admin/delete-product/<%=p.productID%>">
            <button>Törlés</button>
        </form>

    meg itt az index-en is nagyon hasonló lesz ez a get-es kérés, mint a admin/termekek get-es kérés, ezért lemásoljuk és kitöröljük, ami nem kell 
    app.get("/termekek", async (req, res)=> {
    try {
        // checkAdminPermission(
        //     req.session.userID,
        //     req.session.isAdmin
        // ); 
    
        const page = req.query.page ? parseInt(req.query.page) : 1;
        const products = await pr.getProducts(page);
        const messageAndSuccess = getMessageAndSuccess(req.query);
        
        //res.render("admin/products", { itt majd public mappából jelenítjük meg a products.ejs-ünket 
        res.render("public/products", {
            //layout: "./layouts/admin_layout",
            layout: "./layouts/public_layout",
            title: "Termékek",
            baseUrl: process.env.BASE_URL,
            page: "termekek",            
            message: messageAndSuccess.message,
            success: messageAndSuccess.success,
            products: products,
            page:page,
            // loggedIn-et majd itt meg kell adni, mert ez várja a public_layout 
            loggedIn: nullOrUndefined(req.session.isAdmin) ? -1 : req.session.isAdmin

        })
    } catch(err) {
        console.log(err);
        res.redirect(`/?message=${err.message}`);
    }
});

És most így megjelenítettük, de viszont ha tovább akarunk menni a pagination-val lapozni egyet, akkor ezt kapjuk 
localhost:3000/?message=Jelentkezz%20be%20a%20tartalom%20megtekintéséhez!

Azért mert a pagination-nál ezt át kell írni, mert az admin/termekek-re akart itt minket átírányítani 
és nekünk majd a sima termekek-re, ezért ki kell törölni azt, hogy /admin 

        <div class="pagination">
                <a href="<%=baseUrl%>/admin/termekek?page=<%=page > 1 ? page-1 : 1%>">
                    <button>
                        &lt;
                    </button>
                </a>
                <a href="<%=baseUrl%>/admin/termekek?page=<%=page < productData.maxPage ? page+1 : productData.maxPage>">
                    <button>
                        &lt;
                    </button>
                </a>
        </div>
    ->
            <div class="pagination">
                <a href="<%=baseUrl%>/termekek?page=<%=page > 1 ? page-1 : 1%>">
                    <button>
                        &lt;
                    </button>
                </a>
                <a href="<%=baseUrl%>/termekek?page=<%=page < productData.maxPage ? page+1 : productData.maxPage>">
                    <button>
                        &lt;
                    </button>
                </a>
        </div>

    És akkor itt vannak a termékek és tudunk lapozni is 
    localhost:3000/termekek?page=1 vagy 2,3,4,5 attól függ, hogy hova lapozunk, amit megcsináltunk múltkor a pagination-val
    
    Meg itt meg kellene majd jelenni a termékképnek is 
    -> 
    <div class="grid">
        <% productData.products.forEach(p=> {  %>
            <div class="box">
                <div class="product-img">        *****
                    <img src="<%=p.filePath%>">  ******
                </div>                           ******
    és fontos, hogy amikor megadjuk a src-t az img-nek, akkor nem kell elé a baseUrl, mert ezek a fake img-k úgy vannak elmentve a filePath-vel 
    hogy van nekik ilyenjük, tehét nem valami.jpg hanem http://fakeimage/valami.jpg 

    .product-img {
        width:100%;
        height: 200px;  
    }

    .product-img img {
        width:100%;
        height: 200px;  
        object-fit: cover;
    }

    és a megnyitás is az nem 
        <a href="<%= baseUrl%>/admin/termek/<%=p.productID%>">
            <button>Megnyítás</button>
        </a>
    hanem simán admin nélkül, hogy termek
        a href="<%= baseUrl%>/termek/<%=p.productID%>">
            <button>Megnyítás</button>
        </a>
    és még ezt a link-et a képre is rátettük
        <div class="product-img">
            <a href="<%= baseUrl%>/termek/<%=p.productID%>">      *******
                <img src="<%=p.filePath%>">
            </a>                                                  *******
        </div>

    Tehát, ha rákattintunk a képre, akkor is elvisz minket ide 
    localhost:3000/termek/80 
    csak még nincsen ilyenünk, kell egy ilyen oldalt majd létrehozni, hogy termek/:productID

    És ehhez már van metódusunk, ami id alapján le tudja szedni a terméket és még ráadásul ez is nagyon hasonló lesz az admin/termek/:productID-ra

    Ami itt kell nekünk ez a getProductByID, csak itt még meg van hívva a getProductCategories is 
        const productData = await pr.getProductByID(req.params.productID);
        const categories = await pc.getProductCategories()
    Azért, mert productData-ban a  category az csak egy szám, nem a tényleges kategória, mert az egy másik táblán van, csak ezek a táblák össze 
        vannak kapcsolva 

        async getProductByID(productID) {
             if (nan(productID)) {
                throw {
                    status: 400,
                    message: ["Nem megfelelő termékazonosító"]
                }
            }
    
            try {
                const response = await conn.promise().query("SELECT * FROM products WHERE productID = ?",
                    [productID])
    
                if (response[0].length > 0) {
                    return response[0][0];
                } else {
                    throw {
                        status: 404,
                        message: ["A termék nem található!"]
                    }
                }

    Tehát itt csak leszedjük a mindent a products táblából 
    const response = await conn.promise().query("SELECT * FROM products WHERE productID = ?",

    Itt meg leszedünk mindent a product.categories táblából 
        async getProductCategories() {
            try {
                const response = await conn.promise().query("select * from product_categories");
                return response[0];

    De ezt lehetne úgy is, hogy a getProductByID-nél csinálunk egy joint és ott leszedjük a product_categories táblából, ami kell nekünk 
        az a categoryName 
    -> 
    !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    try {
    const response = await conn.promise().query
        (`
            SELECT products.*, product_categories.categoryName
            FROM products 
            INNER JOIN product_categories
            ON product_categories.categoryID = products.productCategory
            WHERE productID = ?
            `,
            [productID]
        )

    Itt amit render-elni szeretnénk res.render("public/product",
        a public mappában lévő product.ejs, de olyan még nincsen, ezért ezt is meg kell csinálni 
    Ez is nagyon hasonló lesz, mint az admin-on lévő product, ezért lemásoljuk és megváltoztatjuk amit kell 

    Ami biztos, hogy itt nem lesznek majd form-ok, szóval inkább megcsináljuk az ejs-t 
    Úgy oldjuk meg, hogy van bal oldalon egy kép meg jobb oldalon a termékadatok (grid-2) 

    Ami fontos, hogy amikor be akarunk valamit helyetsíteni, akkor kell a ?, mert így nem fogunk hibát kapni, ha nincs meg az a dolog 
    <h3><%=productData?******.productName%></h3>

    <div class="container text-center">
    <div class="grid-2">
        <div class="box">
            <div class="product-image-large">
                <img src="<%=productData.filePath%>">
            </div>
        </div>
        <div class="box">
            <h3><%=productData?.productName%></h3>
            .......
        </div>

    Tehát van egy grid-2, ami kettéosztja a képernyőt ebben van kettő box
    1 box -> egy div, mert ebbe van egy kép, img az src-t meg filePath-ben van elmentve az adatbázisban, amit productData-ban leszedünk, itt meg 
        átadjuk 
    2 box -> itt megjelenítünk különböző adatokat a productData-ból 

    Így akarjuk, hogy megjelenjenek majd a sorok, hogy az egyiknek a háttérszíne szürke a másiknak fehér legyen 
    Terméknév                          valami       (szürke)
    Ár                                valamennyi    (fehér) 
    Erre készítettünk egy striped osztályt, amit megadtunk annak a div-nek, aminek a box-ot is
    ->         
        <div class="box striped*****">
            <div class="grid-2">
                <div>Terméknév</div>
                <div><%=productData?.productName%></div>
            </div>
            <div class="grid-2">
                <div>Terméknév</div>
                <div><%=productData?.productName%></div>
            </div>

    Tehát a striped-on belüli div nth-child(odd) az kapott egy background-color-t, de ez így nem teljesen lett jó 
    meg az sem, hogy nth-child(2n)
    Mert lehet, hogy erre vonatkoztatja 
        <div>Terméknév</div>
    és nem erre amire szeretnénk 
        <div class="grid-2">
            <div>Terméknév</div>
            <div><%=productData?.productName%></div>
        </div>
    
    Erre van két megoldás, az egyik az, hogy ezek span-ban lesznek, hogy ne zsavarjanak be
    Az zavart be, hogy a striped-on belüli div, csak azon belül is volt egy div  
    ->
        <div class="grid-2">
            <span>Terméknév</span>
            <span><%=productData?.productName%></span>
        </div>
        <div class="grid-2">
            <span>Terméknév</span>
            <span><%=productData?.productName%></span>
        </div>
    
    Másik megoldás meg css-es
    Hogy a közvetlen leszármazottra vonatkoztatunk (> jel!!!!!!!!!)
    ->
    .striped > div:nth-child(odd) {
        background-color: white;
    }
    És hogyha közvetlen leszármazott, akkor csak arra vonatkozik, hogy erre 
            <div class="box striped">
                <div class="grid-2"> ***** ere vonatkozik, mert ez a közvetett leszármazott 
                    <div>Terméknév</div>  ***** erre meg nem, mert ez a striped-nak ez a div már csak közvettet leszármazottja 

    És akkor így megjelenítjük az adatokat, de a desc az egy hosszabb leírás lesz, ezért majd megjelenítjük egy white-box-ba 
    Meg a striped-ot mégsem arra rakjuk majd amin a box van, hanem egy másik div-re alatta és majd lesz egy title, ami nem lesz bent ebben
        tehát ez majd középen lesz, mert nincs benne a grid-ben  
    ->
        <div class="box">
        <h3><%=productData?.title%></h3>
        <div class="striped">
            <div class="grid-2">
                <div>Terméknév</div>
                <div><%=productData?.productName%></div>
            </div>
            <div class="grid-2">
                <div>Ár</div> .... 

                        Ami a title 
    Terméknév                          valami       (szürke)
    Ár                                valamennyi    (fehér)
**********
    Nagyon fontos, hogyha azt akarjuk, hogy mindkét div ugyanolyan magas legyen, ami a grid-2-ben van, akkor ezt kell használni 
    align-items: stretch; Ensures both items have the same 
    ->
    .grid-container {
        display: grid
        grid-template-columns: 1fr 1fr;  Two equal columns
        gap: 10px;
        align-items: stretch;  Ensures both items have the same height 
    }

    .grid-item img {
        width: 100%;
        height: auto;  Ensures the image keeps its aspect ratio 
    }

    HTML kód 
    <div class="grid-container">
        <div class="grid-item">
            <img src="your-image.jpg" alt="Image description" />
        </div>
        <div class="grid-item grid-2">
            This is the second grid item. It will match the height of the image.
        </div>
    </div>
*************

    Ha megjelenítettük az összes adatot, akkor lesz egy button (Kosárba)
    mellette meg lesz egy input ami mutatja, hogy mennyit, akarunk vásárolni, aminek a kezdőértéke (value) 1 lesz 
    ->
    <div class="grid-2" style="margin-top: 25px;">
        <div>
            <input type="number" value="1">
        </div>
        <div>
            <button>Kosárba</button>
        </div>
    </div>
    Azért tettük be egy grid-2-be, meg egy div-be még, hogy egymás mellett legyenek, ne egymás alatt 

    És ez az egész nem egy div-ben, hanem egy form-ban lesz benne, hogy át tudjon írányítani minket 
    <form class="grid-2" style="margin-top: 25px;">
        <div>
            <input type="number" value="1" name="quantity">
            <input type="hidden" name="productID" value="<%=productData.productID%>">
        </div>
        <div>
            <button>Kosárba</button>
        </div>
    </form>

    Csináltunk egy hidden input mezőt is, aminek megaduk a productID értékként, tehát amikor ezt beküldjük, akkor
    az is benne lesz, meghozza azon a kulcson, amit itt megadtunk a name attributummal 

    És amikor ez van megnyitva, hogy localhost:3000/termek/14 
    Akkor input-nak a value az kell, hogy legyen value="14"

    És ha megnyomjuk a button-t, akkor az URL-ben látszódik a quantity, ami be van állítva meg az productID is 
    ->
    localhost:3000/termek/14?quantity=1&productID=14

    De ugye ennek nem get-nek, mert azért látszódik, mert nem adtunk meg metódust 
    ->
    Ha a HTML formban nem adunk meg kifejezetten metódust, akkor alapértelmezetten a GET módszert használja. 
    Amikor a GET módszert használja a form, az űrlap adatai a URL-hez lesznek hozzáfűzve kérdéses paraméterek formájában, 
    ezért látunk egy ilyen URL-t: localhost:3000/termek/14?quantity=1&productID=14

    Ez azért történik, mert a böngésző kódolja az űrlap adatait, és a URL után a kérdőjel (?) után illeszti be azokat!!!!!!!!!

    De nekünk nem ez kell, hanem csinálunk egy post kérést, ahol megadunk egy action-t, ahova be fogjuk küldeni 
    -> 
    <form method="post" action="<%=baseUrl/add-to-cart%>"
    class="grid-2" style="margin-top: 25px;"> ....

    És akkor csinálunk egy Cart.js-t és azért kell megtervezni, mert a session-t kell használni, abba fogjuk tárolni a cart-ot!!!!!! 
    Az első get-es kérésnél azt csináljuk, hogyha a req.session.cart az null vagy undefined, akkor csinálunk egy req.session.cart-ot 
        ami egy üres tömb lesz!!!!!!

    app.get("/", (req, res)=> {
    if(nullOrUndefined(req.session.cart)) 
        req.session.cart = [];

    És akkor elvileg mindenhol létrejön ez a cart 
    Ezt úgy tudjuk megnézni, hogy application (ahol van az elements meg a console) és itt vannak ilyenek, hogy 
        Local storage, Session storage, Cookies, Cache storage ... 

    Létrehozunk a Cart class-t az app-ban

    




*/ 

