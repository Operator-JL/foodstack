(function () {
  const categories = ['Burgers', 'Burritos', 'Tacos', 'Sides', 'Drinks'];
  const products = [
    {
      id: 'stack-burger',
      name: 'Stack Burger',
      price: 8.99,
      category: 'Burgers',
      description: 'Classic stack with fresh lettuce and house sauce.',
      image: 'assets/images/burgers/stack-burger.jpg'
    },
    {
      id: 'double-burger',
      name: 'Double Burger',
      price: 10.99,
      category: 'Burgers',
      description: 'Double patty burger for a hungry order.',
      image: 'assets/images/burgers/double-burger.jpg'
    },
    {
      id: 'bbq-bacon-burger',
      name: 'BBQ Bacon Burger',
      price: 11.49,
      category: 'Burgers',
      description: 'Smoky BBQ flavor with crispy bacon.',
      image: 'assets/images/burgers/bbq-bacon-burger.jpg'
    },
    {
      id: 'spicy-burger',
      name: 'Spicy Burger',
      price: 9.99,
      category: 'Burgers',
      description: 'Spiced patty with jalapeno kick.',
      image: 'assets/images/burgers/spicy-burger.jpg'
    },
    {
      id: 'burrito-stack',
      name: 'Burrito Stack',
      price: 7.99,
      category: 'Burritos',
      description: 'Loaded burrito with rice, beans and salsa.',
      image: 'assets/images/burritos/burrito-stack.jpg'
    },
    {
      id: 'chicken-burrito',
      name: 'Chicken Burrito',
      price: 8.49,
      category: 'Burritos',
      description: 'Grilled chicken, beans and creamy chipotle sauce.',
      image: 'assets/images/burritos/chicken-burrito.jpg'
    },
    {
      id: 'veggie-burrito',
      name: 'Veggie Burrito',
      price: 7.59,
      category: 'Burritos',
      description: 'Fresh veggies, rice and guacamole in a warm tortilla.',
      image: 'assets/images/burritos/veggie-burrito.jpg'
    },
    {
      id: 'spicy-beef-burrito',
      name: 'Spicy Beef Burrito',
      price: 8.99,
      category: 'Burritos',
      description: 'Seasoned beef, jalapenos and spicy house salsa.',
      image: 'assets/images/burritos/spicy-beef-burrito.jpg'
    },
    {
      id: 'taco-supreme',
      name: 'Taco Supreme',
      price: 6.99,
      category: 'Tacos',
      description: 'Crunchy taco with seasoned meat and greens.',
      image: 'assets/images/tacos/taco-supreme.png'
    },
    {
      id: 'classic-taco',
      name: 'Classic Taco',
      price: 5.99,
      category: 'Tacos',
      description: 'Traditional taco with fresh pico and lettuce.',
      image: 'assets/images/tacos/taco-classic.png'
    },
    {
      id: 'chicken-taco',
      name: 'Chicken Taco',
      price: 6.49,
      category: 'Tacos',
      description: 'Tender chicken taco with citrus slaw.',
      image: 'assets/images/tacos/taco-chicken.png'
    },
    {
      id: 'spicy-taco',
      name: 'Spicy Taco',
      price: 6.79,
      category: 'Tacos',
      description: 'Hot chili taco with a smoky pepper finish.',
      image: 'assets/images/tacos/taco-spicy.png'
    },
    {
      id: 'fries',
      name: 'Fries',
      price: 3.49,
      category: 'Sides',
      description: 'Golden fries, hot and crispy.',
      image: 'assets/images/sides/fries.png'
    },
    {
      id: 'onion-rings',
      name: 'Onion Rings',
      price: 4.29,
      category: 'Sides',
      description: 'Crispy onion rings with zesty dipping sauce.',
      image: 'assets/images/sides/onion-rings.png'
    },
    {
      id: 'nachos',
      name: 'Nachos',
      price: 4.99,
      category: 'Sides',
      description: 'Corn chips topped with cheese and jalapeno.',
      image: 'assets/images/sides/nachos.png'
    },
    {
      id: 'cheese-bites',
      name: 'Cheese Bites',
      price: 4.79,
      category: 'Sides',
      description: 'Melty cheese bites with golden crunch.',
      image: 'assets/images/sides/cheese-bites.png'
    },
    {
      id: 'soda',
      name: 'Soda',
      price: 2.49,
      category: 'Drinks',
      description: 'Cold soda to pair with your meal.',
      image: 'assets/images/drinks/soda.png'
    },
    {
      id: 'lemonade',
      name: 'Lemonade',
      price: 2.99,
      category: 'Drinks',
      description: 'Fresh lemonade, lightly sweet and icy.',
      image: 'assets/images/drinks/lemonade.png'
    },
    {
      id: 'iced-tea',
      name: 'Iced Tea',
      price: 2.89,
      category: 'Drinks',
      description: 'Chilled black tea with lemon notes.',
      image: 'assets/images/drinks/iced-tea.png'
    },
    {
      id: 'milkshake',
      name: 'Milkshake',
      price: 4.99,
      category: 'Drinks',
      description: 'Creamy vanilla shake topped with whipped cream.',
      image: 'assets/images/drinks/milkshake.png'
    }
  ];

  function notifyCartChange() {
    window.dispatchEvent(new CustomEvent('foodstack:cart-updated'));
  }

  function normalizeCart(candidate) {
    if (!candidate || typeof candidate !== 'object') {
      return {};
    }

    const normalized = {};

    Object.entries(candidate).forEach(([id, qty]) => {
      const amount = Math.floor(Number(qty));

      if (findProduct(id) && amount > 0) {
        normalized[id] = amount;
      }
    });

    return normalized;
  }

  function readCart() {
    const raw = window.localStorage.getItem('foodstack-cart');

    if (!raw) {
      return {};
    }

    try {
      const parsed = JSON.parse(raw);
      return normalizeCart(parsed);
    } catch (error) {
      return {};
    }
  }

  function writeCart(cart) {
    window.localStorage.setItem('foodstack-cart', JSON.stringify(normalizeCart(cart)));
    notifyCartChange();
  }

  function clearCart() {
    window.localStorage.removeItem('foodstack-cart');
    notifyCartChange();
  }

  function addToCart(productId, amount) {
    const cart = readCart();
    const current = Number(cart[productId] || 0);
    const next = Math.max(0, current + amount);

    if (next === 0) {
      delete cart[productId];
    } else {
      cart[productId] = next;
    }

    writeCart(cart);
    return cart;
  }

  function cartCount() {
    const cart = readCart();
    return Object.values(cart).reduce((sum, qty) => sum + Number(qty || 0), 0);
  }

  function byCategory(category) {
    if (!category || category === 'All') {
      return products.slice();
    }

    return products.filter((item) => item.category === category);
  }

  function findProduct(productId) {
    return products.find((item) => item.id === productId) || null;
  }

  function money(value) {
    return '$' + Number(value).toFixed(2);
  }

  window.FOODSTACK_DATA = {
    categories,
    products,
    byCategory,
    findProduct,
    readCart,
    writeCart,
    clearCart,
    addToCart,
    cartCount,
    money
  };
})();
