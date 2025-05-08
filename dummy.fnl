;; dummy.fnl - Test file to confirm visibility
;; This is just a placeholder file in Fennel syntax

(local version "1.0.0")

(fn greet [name]
  (print (.. "Hello, " name "! The agent strategy page looks great.")))

(fn main []
  (greet "User")
  (print "The customer agent strategy has been implemented successfully.")
  (print "The page now shows:")
  (print "- Customer cohort-based strategy")
  (print "- Current and previous week tabs")
  (print "- Promotions with 'Why this reward?' explanations")
  (print "- App banners with visual styling")
  (print "- Messaging schedule in tabular format"))

(main) 