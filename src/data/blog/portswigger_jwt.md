---
title: JWT attacks
author: suo yuan
pubDatetime: 2022-12-26T03:42:51Z
draft: false
tags:
  - Web Security
  - PortSwigger Web Academy
  - JWT
description:
  "PortSwigger Web Academy 中关于 JWT 的部分"
---

<!--more-->
PortSwigger Web Academy 中关于 JWT 的部分
<!--more-->

# JWT attacks

## JWT

JSON Web Tokens (JWT)，是一种在不同系统之前发送加密签名过的JSON数据的标准格式。通常用于发送关于用户的相关信息。

### JWT组成

- header
- payload
- signature

如下面的例子所示，三部分之间用`.`分隔

```
eyJraWQiOiI5MTM2ZGRiMy1jYjBhLTRhMTktYTA3ZS1lYWRmNWE0NGM4YjUiLCJhbGciOiJSUzI1NiJ9.eyJpc3MiOiJwb3J0c3dpZ2dlciIsImV4cCI6MTY0ODAzNzE2NCwibmFtZSI6IkNhcmxvcyBNb250b3lhIiwic3ViIjoiY2FybG9zIiwicm9sZSI6ImJsb2dfYXV0aG9yIiwiZW1haWwiOiJjYXJsb3NAY2FybG9zLW1vbnRveWEubmV0IiwiaWF0IjoxNTE2MjM5MDIyfQ.SYZBPIBg2CRjXAJ8vCER0LA_ENjII1JakvNQoP-Hw6GG1zfl4JyngsZReIfqRvIAEi5L4HV0q7_9qGhQZvy9ZdxEJbwTxRs_6Lb-fZTDpW6lKYNdMyjw45_alSCZ1fypsMWz_2mTpQzil0lOtps5Ei_z7mM7M8gCwe_AGpI53JxduQOaB5HkT5gVrv9cKu9CsW5MS6ZbqYXpGyOG5ehoxqm8DL5tFYaW3lB50ELxi0KsuTKEbD0t5BCl0aCR2MBJWAbN-xeLwEenaqBiwPVvKixYleeDQiBEIylFdNNIMviKRgXiYuAvMziVPbwSgkZVHeEdF5MQP1Oe2Spac-6IfA
```

header和payload两个部分都是base64_url编码的JSON对象，header包括令牌本身的数据，payload包括关于用户实际的声明。例如上述的令牌的payload解码后就是：

```json
{
    "iss": "portswigger",
    "exp": 1648037164,
    "name": "Carlos Montoya",
    "sub": "carlos",
    "role": "blog_author",
    "email": "carlos@carlos-montoya.net",
    "iat": 1516239022
}
```

大多数情况下，能拿到令牌就意味着能够修改它，所以基于JWT机制的安全性都依赖于加密签名。

### JWT signature
发出令牌的签名通常由对header和payload消息摘要算法处理而成。有时候会把消息摘要算法处理过的结果进行加密。无论时候进行后续的加密，这个过程都会涉及到一个密钥。

- 由于signature包括令牌的其他部分，所以更改header或paylaod都会导致signature不匹配
- 如果不知道密钥，就不能根据header和payload生成正确的signatire

### JWT JWS JWE

JWT只定义了一种表达信息的格式作为一个在不同系统之间传递的JSON对象。事实上JWT并不是作为独立的实体使用。JWT由JSON Web Signature (JWS)和JSON Web Encryption (JWE)扩展而成，它们定义实现JWT的具体方法。

JWT通常时JWS或JWE令牌。通常使用JWT的时候都在说JWS令牌。JWEs和它相似，只不过令牌的内容时加密的而非编码的。

## JWT攻击

### 概述

JWT攻击就是修改用户发送给服务器的JWT，通常用于模拟另一个身份去绕过身份验证和一些访问上的限制。

### 漏洞产生条件

JWT漏洞通常因为网站对JWT的处理有问题而产生，因为很多实现细节是由网站开发者自己确定的。

这些问题通常就是JWT的signature没有得到正确的验证，或者密钥是否被暴力破解或泄露。

### 漏洞利用

#### 接收任意signatures

JWT库提供了两个方法，一个用于验证令牌，一个只用于解码。例如Node.js的`jsonwebtoken`库有`verify()`和`decode()`。如果开发者并不清楚这两个方法，只是将令牌给了`decode()`，那么signature也就形同虚设了。

#### 没有signature的令牌

JWT的header中有个`alg`参数，它指明了服务器使用那种算法对令牌进行签名。

服务器信任`alg`参数指定的算法，攻击者可以选择修改算法名称。`alg`参数可以被设置为`none`并删除signature，服务器通常会拒绝这样的令牌，有时候可以通过混淆来绕过对这样字符串的过滤。虽然没有了signature，但是payload和signature之间的`.`需要保留。

#### 暴力破解密钥

一些消息摘要算法使用任意字符串作为密钥，像HS256(HMAC + SHA-256)。

开发者实现JWT时可能会犯一些错误，比如使用弱密码，这时候攻击者可以选择暴力破解这个密钥。

##### 使用hashcat

```bash
hashcat -a 0 -m 16500 <jwt> <wordlist>
```

#### JWT header参数注入

JWS规定header中必须有`alg`参数，实际上JWT的header还有其他参数，比如：

- jwk (JSON Web Key)，提供一个表示key的JSON对象
- jku (JSON Web Key Set URL)，提供了一个可以让服务器从中获取包含正确密钥的一组密钥的URL
- kid (Key ID)，提供一个当有多个密钥的情况下用于确定正确密钥的ID

这些参数用于服务器验证signature使用哪个密钥。

##### 注入jwk参数

服务器使用该参数将其公钥以jwk格式嵌入令牌中，例如：

```json
{
    "kid": "ed2Nf8sb-sD6ng0-scs5390g-fFD8sfxG",
    "typ": "JWT",
    "alg": "RS256",
    "jwk": {
        "kty": "RSA",
        "e": "AQAB",
        "kid": "ed2Nf8sb-sD6ng0-scs5390g-fFD8sfxG",
        "n": "yy1wpYmffgXBxhAUJzHHocCuJolwDqql75ZWuCQ_cb33K2vh9m"
    }
}
```

服务器会使用公钥白名单来验证JWT的signature，然而错误的配置服务器会导致它使用jwk中的任何密钥。攻击者可以用自己的RSA私钥处理一个修改后的JWT，然后将匹配的公钥放在jwk中。

##### 注入jku参数

从中获取到的是一个JSON对象：

```json
{
    "keys": [
        {
            "kty": "RSA",
            "e": "AQAB",
            "kid": "75d0ef47-af89-47a9-9061-7c02a610d5ab",
            "n": "o-yy1wpYmffgXBxhAUJzHHocCuJolwDqql75ZWuCQ_cb33K2vh9mk6GPM9gNN4Y_qTVX67WhsN3JvaFYw-fhvsWQ"
        },
        {
            "kty": "RSA",
            "e": "AQAB",
            "kid": "d8fDFo-fS9-faS14a9-ASf99sa-7c1Ad5abA",
            "n": "fc3f-yy1wpYmffgXBxhAUJzHql79gNNQ_cb33HocCuJolwDqmk6GPM4Y_qTVX67WhsN3JvaFYw-dfg6DH-asAScw"
        }
    ]
}
```

攻击者通过修改jku指向的URL，修改后的URL存储自己的密钥信息，就可以通过校验

##### 注入kid参数

服务器可能会使用多个密钥对不同类型的数据进行签名，这样JWT的header可能包含一个`kid`参数用于确定验证签名时使用哪个密钥。

JWS规范没有定义`kid`的具体结构，这是开发人员选择的一个任意的字符串。`kid`可以是指向数据库的特定条目，甚至指向一个文件名。

```json
{
    "kid": "../../path/to/file",
    "typ": "JWT",
    "alg": "HS256",
    "k": "asGsADas3421-dfh9DGN-AFDFDbasfd8-anfjkvc"
}
```

如果服务器支持对称加密算法处理的JWT，攻击者可以使`kid`参数指向一个已知的文件，并且使用与该文件内容对应的密钥。例如指向`/dev/null`这个文件，使用Base64编码过的空字节对令牌进行对称加密。如果密钥被存储在数据库中，`kid`参数还是一个可能出现SQL注入的地方。

##### 其他参数

- cty (Content Type)，通常在不会存在于header中，但是底层解析库无疑是支持它的。将`cty`的值改成`text/xml`或`application/x-java-serialized-object`，这可能会造成XXE或反序列化。
- x5c (X.509 Certificate Chain)，用于传递密钥的X.509公钥证书或证书链。该参数可以被注入自签名的证书。`CVE-2017-2800`和`CVE-2018-2633`

#### 算法混淆

算法混淆（密钥混淆）是因为攻击者可以强制服务器使用网站开发者没想到的算法来验证JWT的signature。

##### 对称加密与非对称加密

JWT可以使用不同的算法进行签名处理。HS256 (HMAC + SHA-256)使用对称的密钥，这意味着加解密用的是同一个密钥。RS256 (RSA + SHA-256)使用非对称的密钥，这包括公钥（用于验证签名）和私钥（即可签名可以验证）。

##### 漏洞产生

由于JWT库的实现的缺陷，通常会出现算法混淆漏洞。尽管现实中的验证过程所使用的算法会有所不同，但很多库提供来一种单一且与算法无关的方法来验证签名。这种方法依赖于`alg`参数确定验证类型。

下面的伪代码展示来一个通用的`verify()`函数可能是什么样：

```javascript
function verify(token, secretOrPublicKey){
    algorithm = token.getAlgHeader();
    if(algorithm == "RS256"){
        // Use the provided key as an RSA public key
    } else if (algorithm == "HS256"){
        // Use the provided key as an HMAC secret key
    }
}
```
假设使用这种函数的网站开发者用它专门处理非对称加密算法

```javascript
publicKey = <public-key-of-server>;
token = request.getCookie("session");
verify(token, publicKey);
```

这种情况下，服务器接收一个对称加密算法处理的令牌，`verify()`函数会把公钥视作密钥。攻击者可以使用非对称加密的公钥对令牌进行签名，服务器用公钥来验证签名。

##### 攻击步骤

1. 获取服务器公钥
2. 转换公钥的格式
3. 修改JWT的payload和header的`alg`
4. 使用公钥作为密钥对其进行签名

###### 获取服务器公钥

服务器有时会通过`/jwks.json`或`/.well-known/jwks.json`将公钥作为JWK (JSON Web Key)公开。

即使不公开，也可以根据多个已知的JWT搞出公钥。

对于上述情况，GitHub的[rsa_sign2n](https://github.com/silentsignal/rsa_sign2n)仓库存在`jwt_forgery.py`等脚本对此有所帮助。

###### 转换公钥的格式

虽然服务器可能会公开它们的公钥，但是验证令牌的signature的时候用的是本地文件或数据库中存储的副本，这俩之前可能以不同的形式存储。

为了保证攻击成功，攻击者需要保证用来签名的密钥和服务器的不仅格式一致，每一个字节都是一样的。比如可能需要的是`X.509 PEM`格式的密钥，但获得的是`JWK`格式。
