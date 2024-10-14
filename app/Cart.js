import nullOrUndefined from "./nullOrUndefined.js";
import conn from "./conn.js";
import nan from "./nan.js";

class Cart {
    _cart;

    set cart(cart) {
        this._cart = !nullOrUndefined(cart) ? cart : [];
    }

    findIndex(productID) {
        return this._cart.findIndex(p=>p.productID === productID);
    }

    addProduct(productData) {
        const index = this.findIndex(productData.productID);

        if(index === -1) {
            this._cart.push(productData);
        } else {
            this._cart[index].quantity += productData.quantity;
        }
    }

    deleteProduct(productID) {
        const index = this.findIndex(productID);

        if(index !== -1) {
            this._cart.splice(index, 1);
        }
    }
}

export default Cart;

/*
    Milyen funkciók kellenek a cart-hoz
    1. addProduct, hogy hozzá tudjunk adni terméket, ami vár egy productData (az adatokkal, hogy quantity meg ID) 

    Ami még itt fontos, hogy át kell adni neki constructor-ban a session-t!!!!!

    constructor(session) {
        this.session = session;
    } 

    utána meg azt, hogy cart this.cart = this.session... 
    de azt is lehet, hogy alapból a cart-ot adjuk át neki!!!! 
    Az lényeg, hogy hol fog elkészülni ez a cart példány, mert a cart példányt azt elöbb hivjuk meg az index-en const c = new Cart();
    de viszont a session itt még nem lesz, késöbb fog elkészülni 
        mert az csak a különböző endpoint-okban tudjuk megcsinálni!!!!!!!!!!!!
        app.get("/", (req, res)=> {
            if(nullOrUndefined(req.session.cart)) 
                req.session.cart = [];

    És ezzel nem biztos, hogy valaki meglátogatja a kezdőlapot, tehát ez lehet, hogy felesleges itt
        if(nullOrUndefined(req.session.cart)) 
            req.session.cart = [];

    Ezért kell ezt végiggondolni, hogy hogyan csináljuk, hogy mindig készítünk egy új Cart példányt, amibe beledobjuk a session-ünket 
    De ez is megoldható, mert akkor mindig készítünk egy új példányt, amikor valamit csinálni akarunk a kosárral 
    class Cart {
        constructor(cart) {
            this.cart = cart;
        }
    
    Vagy azt is csinálhatjuk, hogy nem így oldjuk meg hanem lesz nekünk alsóvonal cart-unk és utána egy set cart
    class Cart {
    _cart;

    set cart(cart) {
        this._cart = cart;
    }
    És van ez a setter, amit mindig tudunk frissíteni
    de így meg tudjuk oldani a hibaellenőrzést, megoldaja magának ez az osztály 
    -> 
    set cart(cart) {
        this._cart = !nullOrUndefined(cart) ? cart : [];
    }
    Tehát ha nem null vagy undefined a cart, akkor cart, különben egy üres tömb

    addProduct, product-ban kéne, hogy benne legyen egy productID, egy productName meg egy quantity 
    Hogyan adunk valamit hozzá a kosárhoz 
        Ez azért érdekes, mert ha van már olyan termék a kosárban, amit hozzá szeretnénk adni, akkor ki kell keresni az ID alapján 
        hogy van-e olyan termék és ha van, akkor annyival növeljük a quantity-jét, amennyi a productData-ban megtalálható!!!! 

    addProduct(productData) {
        const index = this._cart.findIndex(p=>p.productID === productData.productID);
    }

    van a _cart, ahol el vannak mentve a dolgok, pl. itt van egy olyan, hogy productID és ezt hasonlítjük össze azzal amit belerakunk terméket 
    ez a productData és itt is lesz egy olyan, hogy productID 
    -> 
    A findIndex() metódus visszatérési értéke egy szám lesz, amely az első olyan elem indexét adja meg, 
    amely megfelel a feltételnek. Ha a productData.productID megegyezik valamelyik elem productID-jával a _cart tömbben, 
    akkor annak az elemnek az indexét kapod vissza. Ha nincs ilyen elem, akkor a findIndex() metódus -1-et ad vissza.

    Ha van találat: A metódus visszaadja annak az elemnek az indexét (például 2, ha az a harmadik elem).
    Ha nincs találat: A metódus -1-et ad vissza.

    Egy gond van még, hogy mivel ez egy session, ezért biztosak lehetünk abba, hogy ezt mi úgy kapjuk vissza, hogy egy string-ben 
    De nem biztos, hogy a session-ben csak string-et tudunk tárolni, ezért így kipróbáljuk 
    ->
    app.get("/", (req, res)=> {
    req.session.asdf = {adat:"555"};
    console.log(req.session.asdf);   ->   { adat:'555' } 
    Akkor nem kell json.parse-olni ezeket a dolgokat, mert sima objektumot is tudunk tárolni 

    Az a kérdés, hogy itt index legyen vagy product 
    const product = this._cart.find(p=>p.productID === productData.productID) vagy 
    const index = this._cart.findIndex(p=>p.productID === productData.productID);
    De jobb az index, mert akkor csak egy index-et kapunk vissza 
    És hogyha az index az egyenlő -1-vel, tehát nem volt benne az a termék 
    akkor a push-val beletesszük az egész productData-t -> this._cart.push(productData);
        else ha meg benne volt, akkor meg annak az index-ediknek amit megkaptunk a const index-ből, annak a quantity-jét növeljük
        annyival amennyit a productData.quantity-ja -> this._cart[index].quantity += productData.quantity;

    addProduct(productData) {
        const index = this._cart.findIndex(p=>p.productID === productData.productID);

        if(index === -1) {
            this._cart.push(productData);
        } else {
            this._cart[index].quantity += productData.quantity;
        }
    }
 
    Csinálunk egy deleteProduct-ot és ott is kell majd ez a const index = this._cart.findIndex(p=>p.productID === productData.productID);
    ezért azt kivül megcsináljuk és majd mindkét helyen meghívjuk 

    findIndex() {
        return this._cart.findIndex(p=>p.productID === productData.productID);
    }

    addProduct(productData) {
        const index = this.findIndex();

    deleteProduct vár majd egy productID-t és majd itt is meg lesz hívva a this.findIndex();

    És itt lett ez elrontva, mert a findIndex-nek majd várnia kell egy productID-t 
    findIndex() {
        return this._cart.findIndex(p=>p.productID === productData.productID);
    }
    -> 
    findIndex(productID) {
        return this._cart.findIndex(p=>p.productID === productID);
    }

    addProduct-ba megadjuk neki, amikor meghívjuk a productData.productID-t 
    ->
    const index = this.findIndex(productData.productID);

    deleteProduct-ban megkapja a productID-t 
    ->
    deleteProduct(productID) {
        const index = this.findIndex(productID);
    }
    
    És ha az index nem egyenlő -1-vel this._cart.splice() és azt mondjuk, hogy az index-től egy darabot töröljön ki
    ->
    deleteProduct(productID) {
        const index = this.findIndex(productID);

        if(index !== -1) {
            this._cart.splice(index, 1);
        }
    }
    ******

    Lesz majd itt egy purchase függvény és majd van egy olyan tábla, hogy orders ilyen mezőkkel 
        orderID  userID  addressID  orderStatus created 

    És majd ezt kell megcsinálni a vásárlásnak ,hogy elöször is felviszünk az orders-be egy adatot 
    Az orderID azt visszakapja, mint insertID és utána pedig a details-eket 
    Van egy ilyen tábla is ilyen mezőkkel, hogy 
    detailID  orderID  productID  quantity 
    Hogy mi az orderID, mi a productID, mennyi volt a quantity, azokat meg bedobja ide 
    Szóval ez a purchase ez kicsit bonyolultabb lesz 

    De ami biztos, hogy majd a conn.js-re itt szükség lesz, ezért be kell importálni 
    ->
    import nullOrUndefined from "./nullOrUndefined.js";
    import conn from "./conn.js";
    import nan from "./nan.js";
    Meg a nan is, hogy megnézzük, hogy esetleg a quantity az nem egy szám vagy productID nem egy szám, akkor valami baj van és küldünk egy 
    hibaüzenetet 


    
*/