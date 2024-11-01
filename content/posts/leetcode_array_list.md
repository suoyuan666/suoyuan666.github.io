---
title: "刷代码随想录: 数组和链表"
author: suo yuan
date: 2024-11-01T01:10:15Z
draft: false
tags:
  - algorithm
description: "刷代码随想录的记录，这是数组和链表的部分"
summary: "刷代码随想录的记录，这是数组和链表的部分"
---

# 刷代码随想录: 数组和链表

## 数组
### 二分法

数组范围限定
- 左闭右闭的话，`while` 循环中的条件是 `left <= right`，因为 right 包含在内
- 左闭右开的话，`while` 循环中的条件是 `left < right`，因为 right 不在里面，并且对 `array[mid] < target` 的情况，`right` 应该是 `= mid`，因为 right 不包含在内，不过 `left` 依旧 `= mid + 1`，毕竟是左闭。

### 删除元素

除了暴力地 `for` 循环遍历找到后再 `for` 循环把后续的挪过来之外，还有一个双指针写法:

双指针只需要一次 `for` 循环:

```cpp
for (range array) {
    if (*fast != target) {
        *slow = *fast;
        slow++;
    } else {
        size--; // 为了返回移除后的 size
    }
}
```

### 有序数组的平方

题目是将一个升序的数组都平方，并让平方后的数组也是升序

简单的写法就是平方之后再 `sort` 一遍，但是这样时间复杂度 O(nlogn) 并不好看

所以存在一个更好的解法，即用两个指针，一个在前，一个在尾。之后对首位的大小进行判断。因为数组本身就是递增排序，平方后未必是递增的原因只是因为存在负数的情况，所以最大的只会存在于首尾两侧。

```cpp
vector<int> sortedSquares(vector<int>& nums) {
        auto frist_index = 0;
        auto last_index = static_cast<int>(nums.size()) - 1;
        auto index = static_cast<int>(nums.size()) - 1;

        vector<int> vec(nums.size(), 0);

        while (frist_index <= last_index) {
            auto first_num = nums.at(frist_index) * nums.at(frist_index);
            auto last_num = nums.at(last_index) * nums.at(last_index);

            if (first_num > last_num) {
                vec[index] = first_num;
                frist_index++;
            } else {
                vec[index] = last_num;
                last_index--;
            }
            index--;
        }
        return vec;
    }
```

### 长度最小的子数组

给定一个含有 n 个正整数的数组和一个正整数 s ，找出该数组中满足其和 ≥ s 的长度最小的 连续 子数组，并返回其长度。如果不存在符合条件的子数组，返回 0。

示例：

输入：s = 7, nums = [2,3,1,2,4,3]
输出：2
解释：子数组 [4,3] 是该条件下的长度最小的子数组。

可以采用上次用的快慢指针，快指针用于遍历到底子数组到底到哪，如果满足条件，就把慢指针往前移，再次判断。

```cpp
int minSubArrayLen(int target, vector<int>& nums) {
        auto rs = INT32_MAX;
        auto sum = 0;
        auto length = 0;
        auto first = 0;

        for (auto last = 0; last != nums.size(); last++) {
            sum += nums.at(last);
            while (sum >= target) {
                length = (last - first + 1);
                rs = rs < length ? rs : length;
                sum -= nums.at(first);
                first++;
            }
        }

        return rs == INT32_MAX ? 0 : rs;
    }
```

时间复杂度 O(n)

> 不要以为for里放一个while就以为是O(n^2)啊， 主要是看每一个元素被操作的次数，每个元素在滑动窗后进来操作一次，出去操作一次，每个元素都是被操作两次，所以时间复杂度是 2 × n 也就是O(n)。

### 区间和

题目描述: 给定一个整数数组 Array，请计算该数组在每个指定区间内元素的总和。

输入描述: 第一行输入为整数数组 Array 的长度 n，接下来 n 行，每行一个整数，表示数组的元素。随后的输入为需要计算总和的区间，直至文件结束。

输出描述: 输出每个指定区间内元素的总和。

输入示例

```txt
5
1
2
3
4
5
0 1
1 3
```

输出示例

```txt
3
9
```

类似数组求和都可以考虑这种区间和方式求解。

区间和说的是在数组输入时就将首位到目标位之间的和算出来 (比如在插入第三个的时候，在另一个数组存入第一个到第三个加和的结果)

之后求区间和的时候就用末尾的求和减首尾的求和就好了

```cpp
#include <iostream>
#include <vector>

auto main(void) -> int {
    auto length = 0;
    auto sum = 0;
    auto a = 0;
    auto b = 0;
    auto index = 0;
    std::vector<int> target {};
    std::vector<int> key {};

    std::cin >> length;
    target.resize(length);
    key.resize(length);

    for( auto& val : target) {
        std::cin >> val;
        sum += val;
        key.at(index) = sum;
        index += 1;
    }

    while (std::cin >> a  >> b ){
        if (a == 0) std::cout << key.at(b) << '\n';
        else std::cout << key.at(b) - key.at(a - 1) << '\n';
    }

}
```

### 螺旋矩阵 II

给定一个正整数 n，生成一个包含 1 到 n^2 所有元素，且元素按顺时针顺序螺旋排列的正方形矩阵。

示例:

输入: 3 输出: [ [ 1, 2, 3 ], [ 8, 9, 4 ], [ 7, 6, 5 ] ]

和上边说的注意边界一样，时刻注意是左闭右开还是什么

```cpp
vector<vector<int>> generateMatrix(int n) {
        vector<vector<int>> rs (n, vector<int>(n));

        auto start_x {0};
        auto start_y {0};
        auto offset {1};
        auto count {1};
        auto loop = n / 2;
        const auto mid = n / 2;

        for (;loop > 0; --loop) {
            auto i = start_x;
            auto j = start_y;

            for (; j < n - offset; ++j) {
                rs.at(i).at(j) = count++;
            }
            for (; i < n - offset; ++i) {
                rs.at(i).at(j) = count++;
            }
            for (; j > start_y; --j) {
                rs.at(i).at(j) = count++;
            }
            for (; i > start_x; --i) {
                rs.at(i).at(j) = count++;
            }

            start_x++;
            start_y++;
            offset++;
        }

        if (n % 2 != 0) {
            rs.at(mid).at(mid) = count;
        }

        return rs;
    }
```

## 链表

### 移除链表元素

示例 1： 输入：head = [1,2,6,3,4,5,6], val = 6 输出：[1,2,3,4,5]

示例 2： 输入：head = [], val = 1 输出：[]

示例 3： 输入：head = [7,7,7,7], val = 7 输出：[]

```cpp
ListNode* removeElements(ListNode* head, int val) {
        while(head != nullptr && head->val == val) {
            auto tmp = head;
            head = head->next;
            delete tmp;
        }

        auto rs = head;
        while(head != nullptr && head->next != nullptr) {
            if (head->next->val == val) {
                auto bak = head->next;
                head->next = head->next->next;
                delete bak;
            } else {
                head = head->next;
            }
        }
        return rs;
    }
```

### 设计链表

在链表类中实现这些功能：

`MyLinkedList()` 初始化 `MyLinkedList` 对象。

`int get(int index)` 获取链表中下标为 index 的节点的值。如果下标无效，则返回 -1 。

`void addAtHead(int val)` 将一个值为 val 的节点插入到链表中第一个元素之前。在插入完成后，新节点会成为链表的第一个节点。

`void addAtTail(int val)` 将一个值为 val 的节点追加到链表中作为链表的最后一个元素。

`void addAtIndex(int index, int val)` 将一个值为 val 的节点插入到链表中下标为 index 的节点之前。如果 index 等于链表的长度，那么该节点会被追加到链表的末尾。如果 index 比长度更大，该节点将 不会插入 到链表中。

`void deleteAtIndex(int index)` 如果下标有效，则删除链表中下标为 index 的节点。

```cpp
class MyLinkedList {
    struct LinkList {
        int val;
        struct LinkList *next = nullptr;
    };
private:
    struct LinkList *linklist {};
    uint32_t size {0};
public:
    MyLinkedList(): size(0) {
        linklist = new struct LinkList();
    }

    int get(int index) {
        if (index > size) {
            return -1;
        }
        auto i = 0;
        for (auto val = linklist->next; val != nullptr; val = val->next) {
            if (i == index) {
                return val->val;
            }
            i++;
        }
        return -1;
    }

    void addAtHead(int val) {
        auto link = new struct LinkList();
        link->val = val;
        if (linklist->next != nullptr) {
            link->next = linklist->next;
        }
        linklist->next = link;
        ++size;
    }

    void addAtTail(int val) {
        auto link = new struct LinkList();
        link->val = val;
        auto bak = linklist;
        while (bak != nullptr && bak->next != nullptr) {
            bak = bak->next;
        }
        bak->next = link;
        ++size;
    }

    void addAtIndex(int index, int val) {
        if (index > size || index < 0) {
            return;
        }
        if (index == 0) {
            addAtHead(val);
            return;
        }
        if (index == size) {
            addAtTail(val);
            return;
        }

        auto link = new struct LinkList();
        link->val = val;
        auto bak = linklist->next;
        while (index > 1 && bak != nullptr && bak->next != nullptr) {
            bak = bak->next;
            --index;
        }
        if (index == 1) {
            if (bak->next != nullptr) {
                link->next = bak->next;
            }
            bak->next = link;
            ++size;
        }
    }

    void deleteAtIndex(int index) {
        if (index > size || index < 0) {
            return;
        }
        auto bak = linklist->next;
        while (index > 1 && bak != nullptr && bak->next != nullptr) {
            bak = bak->next;
            --index;
        }

        if (index == 1 && bak->next != nullptr) {
            auto tmp = bak->next;
            bak->next = bak->next->next;
            delete tmp;
            --size;
        } else if (index == 0) {
            bak = linklist;
            linklist = linklist->next;
            delete bak;
            --size;
        }
    }
};
```

### 反转链表

题意：反转一个单链表。

示例: 输入: 1->2->3->4->5->NULL 输出: 5->4->3->2->1->NULL

双指针遍历即可

```cpp
ListNode* reverseList(ListNode* head) {
    ListNode *prev = nullptr;
    auto next = head;

    while (next != nullptr) {
        auto bak = next->next;
        next->next = prev;
        prev = next;
        next = bak;
    }
    return prev;
}
```

### 两两交换链表中的节点

给定一个链表，两两交换其中相邻的节点，并返回交换后的链表。

你不能只是单纯的改变节点内部的值，而是需要实际的进行节点交换。

可以新建一个节点指向当前的头节点，这样就可以把头节点的特殊情况规避掉

```cpp
ListNode* swapPairs(ListNode* head) {
    ListNode *node = new struct ListNode();
    node->next = head;

    auto rs = node;

    while(node != nullptr && node->next != nullptr && node->next->next != nullptr) {
        auto bak_prev = node->next;
        auto bak_next = bak_prev->next->next;

        node->next = node->next->next;
        node->next->next = bak_prev;
        node->next->next->next = bak_next;
        node = node->next->next;
    }
    return rs->next;
}
```

### 删除链表的倒数第N个节点

给你一个链表，删除链表的倒数第 n 个结点，并且返回链表的头结点。

双指针 + 虚拟头节点

第一次循环为了将头指针和尾指针隔开 `n` 个长度，之后将头指针和尾指针往后走，这样直到头节点到末尾，就找到了倒数第 `n` 个位置

```cpp
ListNode* removeNthFromEnd(ListNode* head, int n) {
    ListNode *node = new struct ListNode();
    node->next = head;
    auto next = node;
    auto prev = node;

    while(--n != 0 && next != nullptr) {
        next = next->next;
    }

    next = next->next;

    while(next->next != nullptr) {
        next = next->next;
        prev = prev->next;
    }
    prev->next = prev->next->next;

    return node->next;
}
```

### 链表相交

给你两个单链表的头节点 headA 和 headB ，请你找出并返回两个单链表相交的起始节点。如果两个链表没有交点，返回 null 。

比较直接的解法就是将长的那位调整到和短的齐平，这样就可以同时遍历比较。

```cpp
ListNode *getIntersectionNode(ListNode *headA, ListNode *headB) {
    auto lenA = 0;
    auto lenB = 0;
    auto diff = 0;

    for (auto tmp = headA; tmp != nullptr; tmp = tmp->next) {
        ++lenA;
    }
    for (auto tmp = headB; tmp != nullptr; tmp = tmp->next) {
        ++lenB;
    }

    auto rsA = headA;
    auto rsB = headB;

    if (lenA < lenB) {
        swap(rsA, rsB);
        diff = lenB - lenA;
    } else {
        diff = lenA - lenB;
    }

    for(; diff != 0; --diff) {
        rsA = rsA->next;
    }

    while(rsA != nullptr && rsB != nullptr) {
        if (rsA == rsB) {
            return rsA;
        }
        rsA = rsA->next;
        rsB = rsB->next;
    }

    return nullptr;
}
```

### 环形链表II

题意： 给定一个链表，返回链表开始入环的第一个节点。 如果链表无环，则返回 null。

为了表示给定链表中的环，使用整数 pos 来表示链表尾连接到链表中的位置（索引从 0 开始）。 如果 pos 是 -1，则在该链表中没有环。

说明：不允许修改给定的链表。

可以使用双指针解题，快指针一次走两个，慢指针一次走一个。

参考[代码随想录中](https://github.com/youngyangyang04/leetcode-master)的 gif 可以看出，快慢指针一定会相遇:

![快慢指针 gif](https://code-thinking.cdn.bcebos.com/gifs/141.%E7%8E%AF%E5%BD%A2%E9%93%BE%E8%A1%A8.gif)

因为这一定程度上是快指针在追慢指针，毕竟存在一个环，所以会追上。

确定了确实会成环之后，还需要找到环的入口:

这里涉及到一个简单的数学小问题

![成环链表长度图](https://code-thinking-1253855093.file.myqcloud.com/pics/20220925103433.png)

在相遇的时候，慢指针走了 $x + y$，而快指针走了 $x + y + n (y + z)$，`n` 表示快指针走的圈数

因为快指针每次都比慢指针多走一个，所以存在:

$$
2 (x + y) = x + y + n (y + z)   \\
$$
$$
\Downarrow                      \\
$$
$$
x + y = n (y + z)               \\
$$
$$
\Downarrow                      \\
$$
$$
x = (n - 1) (y + z) + z         \\
$$

当 $n = 1$ 时，$x = z$

也就是说只需要再有一个指针从头出发，另一个指针在快慢指针相遇处出发，碰到的地方就是环的入口

而 $n > 1$ 也无碍，总会遇到。

```cpp
ListNode *detectCycle(ListNode *head) {
    auto fast = head;
    auto slow = head;

    while(fast != nullptr && fast->next != nullptr && slow != nullptr) {
        fast = fast->next->next;
        slow = slow->next;

        if (slow == fast) {
            auto rs_fast = fast;
            auto rs_head = head;

            while (rs_fast != rs_head) {
                rs_fast = rs_fast->next;
                rs_head = rs_head->next;
            }

            return rs_fast == rs_head ? rs_fast : nullptr;
        }
    }

    return nullptr;
}
```