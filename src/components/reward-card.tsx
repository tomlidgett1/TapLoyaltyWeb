// Add this section to show delayed visibility info
{reward.delayedVisibility && (
  <div className="mt-2 text-sm text-muted-foreground">
    <p>
      {reward.delayedVisibilityType === 'transactions' 
        ? `Visible after ${reward.delayedVisibilityTransactions} transactions`
        : `Visible after $${reward.delayedVisibilitySpend} spent`
      }
    </p>
  </div>
)} 