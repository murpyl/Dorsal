# CS 61A — Lecture 9: Recursion

## 1. Base case
A recursive function must have at least one input it can answer directly, without calling itself.
`factorial(0) == 1` and `sum_digits(n) == n` when `n < 10` are base cases. Without one, Python raises `RecursionError`.

## 2. Recursive call
The function calls itself on a *smaller* version of the problem: `factorial(n) = n * factorial(n - 1)`.
Treat the recursive call as already correct (the "recursive leap of faith") and only write what to do with the current `n`.

## 3. Call stack & frames
Every call opens a new frame with its own local names. `factorial(3)` opens frames for `n = 3, 2, 1, 0`.
Frames stack up until a base case returns, then each frame finishes in reverse order.

## 4. Return values
The base case's return value is handed to the frame that called it, which combines it and returns again:
`1 → 1 * 1 → 2 * 1 → 3 * 2 = 6`. Forgetting `return` in front of the recursive call makes the function return `None`.

## 5. Tree recursion
A function that makes more than one recursive call per frame, such as `fib(n) = fib(n - 1) + fib(n - 2)`.
The call tree grows exponentially and recomputes the same subproblems (`fib(2)` is computed many times in `fib(5)`).
