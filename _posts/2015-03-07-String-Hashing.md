---
title: String Hashing
layout: post
---

<script type="text/javascript" src="http://cdn.mathjax.org/mathjax/latest/MathJax.js?config=TeX-AMS-MML_HTMLorMML"></script>
<script>
MathJax.Hub.Config({
	jax: ["input/TeX", "output/HTML-CSS"],
	tex2jax: {
		inlineMath: [ ['$', '$'], ["\\(", "\\)"] ],
		displayMath: [ ['$$', '$$'], ["\\[", "\\]"] ],
		processEscapes: true,
		skipTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code']
	}
	//,
	//displayAlign: "left",
	//displayIndent: "2em"
});
</script>


# String Hashing
String equality can be implemented in constant time. strcmp can be implemented in log(n) time. This is pretty cool, since computer scientists will tell you this is provably impossible. It's also pretty useful if you want to do anything with strings ever. Here we go:
 
Let \\(M\\) be a large prime (\\(10^9 + 7\\) is a good choice). Let's suppose we have a random number generator \\(\text{rand}(A,B)\\) which ouputs a random integer in \\([A,B)\\). We're going to define a hash function \\(H\\) on strings. Start by defining \\(H(c) = rand(1, M)\\) for each character \\(c\\) in the alphabet. Now define \\(H(a_0...a_n) = \sum\_{k=0}^n 2^k H(c\_k)\\) for any string. Then you can show \\(H(S)\\) is a random integer in \\([0,M)\\) for any string \\(S\\), and two different strings get independent hash values.
 
So to check if \\(S_1\\) equals \\(S_2\\), you can just compare \\(H(S_1)\\) to \\(H(S_2)\\), and you'll be wrong with probability at most \\(\frac{1}{M}\\).
 
_But it takes \\(O(\|S\|)\\) time to compute \\(H(S)\\), so have we really saved anything?_

Suppose we are interested in working with the substrings of some string \\(S = a_0...a_n\\). First compute \\(P_i = H(a_0...a_i)\\) for \\(i \in [0,n]\\). Set \\(P\_{-1} = 0\\). Since \\(P\_{i+1} = P\_i + 2^{i+1}\*H[a\_{i+1}]\\), computing all of the Ps only takes \\(|S|\\) time. Then \\(H(a_i...a_j) = \frac{P(j)-P(i-1)}{2^i}\\). Almost. Since we are working mod M, "division" by \\(2^i\\) translates to multiplication by \\(2^{M-1-i}\\).
So actually \\(H(a_i...a_j) = (P(j)-P(i-1))\*(2^{M-1-i}\\). This is constant time, so we can compute the hash of any substring of S in constant time. So we can compare any two substrings of S in constant time!
 
_What if you care about more than one string?_

Suppose you are interested in the strings \\(S_1,...S_n\\). Then define \\(S = S_1+...S_n\\), and play the same game as above with \\(S\\). Now you can compare any of the substrings of \\(S_1,...,S_n\\) against any other substring in constant time.
 
_What if you want...actual comparison?_

We've done equality testing; what if we actually want to compare two strings. Let's think about how comparing \\(S_1\\) to \\(S_2\\) actually works. We find the first character that is different between \\(S_1\\) and \\(S_2\\) and compare that. So it's enough to find how many characters of \\(S_1\\) and \\(S_2\\) match. We can binary search for this number, since string equality testing is now constant time. So strcmp is now \\(log(n)\\) time.
 
_You cheated! You need to store and compute the Ps at the beginning, and you didn't count that in your "constant time"._

That's true. But...you had these strings lying around in the first place...so you had the time to read them in or whatever and the space to store them.
Computing the Ps is a one-time cost, and if you can afford to leave the strings lying around in the first place, you can afford this one-time cost.
 
_If \\(M\\) is \\(10^9+7\\), computing \\(2^{M-1}\\) is expensive!_

That's true. You should precompute all the needed powers of \\(2\\). Specifically: \\(2^0, 2^1, ..., 2^{\|S\|-1}, 2^{M-1}, 2^{M-2}, ..., 2^{M-\|S\|}\\). This is just another \\(2\|S\|\\) things to precompute, so again, it's cheap.
 
_This doesn't really work. It has a \\(\frac{1}{M}\\) chance of being wrong!_

That's true. If you're worried, you can define \\(H2\\) exactly the same way as \\(H\\) (except that you pick different values for \\(H2(c)\\)), and then say two strings are equal only if \\(H(S\_1)=H(S\_2) \text{ and } H2(S\_1)=H2(S\_2)\\). Then the chance of being wrong is \\(1/M^2 = \frac{1}{10^{18}}\\). Which should make you happy. Unless you're Google or something, in which case maybe you want to define \\(H3\\) and \\(H4\\) and H5.
 
But it's still wrong! If it has a 1/10^45 chance of being wrong, it could still be wrong.
No, it really can't. Did you know that cosmic rays actually do flip bits in RAM? (isn't that cool?) Intel estimates this happens about once per month per 256 MB of RAM? So the chance that the cosmic rays will pick the exact clock cycle to flip the exact bit you did the comparison in...is about 1/10^24. But you don't go around saying "My program isn't really right because of cosmic rays". You never even _think_ about cosmic rays. So why are you wasting time worrying about a \\(\frac{1}{10^{45}}\\) chance of failure?
 
Exercises:

1. Prove that \\(H(S\_1)\\) and \\(H(S\_2)\\) are independent
2.
	1. Prove that if \\(X\\) is uniformly distributed on \\([0,M)\\), so is \\(X+a\\) for any constant \\(a\\)
	2. Prove that if \\(X\\) is uniformly distributed on [1,M), so is \\(2X\\)
	3. Prove that \\(H(S)\\) is uniformly distributed on \\([0,M)\\) for any string S
3. What if we use powers of $m$ instead of powers of \\(2\\) to define \\(H\\)? Does anything change?
4. Show how to pre-compute the required powers of 2 in \\(O(\|S\|)\\) time and space.
