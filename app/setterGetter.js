/*
    (Cart) definiál, amely egy _cart nevű privát tulajdonsággal rendelkezik, 
     és van hozzá egy "setter" metódus, amely beállítja ennek az értékét.
*/
class Cart {
    _cart;

    set cart(cart) {
        this._cart = cart;
    }

    get cart() {
        return this._cart;
    }

    addItem(item) {
        if (!this._cart) {
            this._cart = [];
        }
        this._cart.push(item);
    }

    removeItem(itemID) {
        if (this._cart) {
            this._cart = this._cart.filter(item => item.id !== itemID);
        }
    }

    clearCart() {
        this._cart = [];
    }

    getTotal() {
        if (!this._cart) return 0;
        return this._cart.reduce((total, item) => total + item.price, 0);
    }
}

/*
Setter és Getter: A set cart(cart) lehetővé teszi az osztály külső használóinak, 
hogy beállítsák a _cart értékét, míg a get cart() lehetővé teszi az érték elérését.

addItem(item): Hozzáad egy elemet a kosárhoz. 
Ha a kosár még nem létezik (például üres), akkor létrehoz egy új tömböt.

removeItem(itemID): Egy megadott ID-jú elemet eltávolít a kosárból, ha az létezik.

clearCart(): Kiüríti a kosarat.

getTotal(): Kiszámolja a kosár összértékét az elemek árainak összegzésével.
*/ 
