# deviation_tracker_app/deviation_backend/deviations/models.py (FINAL - Action with ManyToManyField)

from django.db import models
from django.contrib.auth.models import User
from django.db.models import Max

class Deviation(models.Model):
    primary_column = models.CharField(max_length=50, blank=True, null=True)
    year = models.IntegerField(blank=True, null=True)
    dev_number = models.CharField(max_length=100, unique=True, db_index=True)
    created_by = models.CharField(max_length=100, blank=True, null=True)
    created_by_user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='deviations_created')

    owner_plant = models.CharField(max_length=100, blank=True, null=True)
    affected_plant = models.CharField(max_length=255, blank=True, null=True)
    sbu = models.CharField(max_length=50, blank=True, null=True)
    release_date = models.DateField(blank=True, null=True)
    effectivity_date = models.DateField(blank=True, null=True)
    expiration_date = models.DateField(blank=True, null=True)
    drawing_number = models.CharField(max_length=255, blank=True, null=True)
    back_to_back_deviation = models.BooleanField(default=False)
    defect_category = models.CharField(max_length=100, blank=True, null=True)
    assembly_defect_type = models.CharField(max_length=100, blank=True, null=True)
    molding_defect_type = models.CharField(max_length=100, blank=True, null=True)
    attachment = models.FileField(upload_to='deviation_attachments/', blank=True, null=True)

    class Meta:
        verbose_name_plural = "Deviations"

    def __str__(self):
        return self.dev_number


class Action(models.Model):
    STATUS_CHOICES = [
        ('Not Started', 'Not Started'),
        ('In Progress', 'In Progress'),
        ('Done', 'Done'),
    ]

    deviation = models.ForeignKey(Deviation, on_delete=models.CASCADE, related_name='actions')
    action_description = models.TextField()
    action_responsible = models.CharField(max_length=100, blank=True, null=True) # Keep this CharField for now, make nullable
    
    # Existing: Single responsible user (will be removed later after data migration)
    

    # NEW FIELD: Multiple responsible users
    action_responsible_users = models.ManyToManyField(User, blank=True, related_name='actions_responsible_multi') # <--- ADD THIS LINE

    action_expiration_date = models.DateField(blank=True, null=True)
    reminder_sent = models.BooleanField(default=False)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='Not Started'
    )

    order = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name_plural = "Actions"
        ordering = ['order', 'id']
        unique_together = ['deviation', 'order']

    def save(self, *args, **kwargs):
        if not self.pk:
            last_order = Action.objects.filter(deviation=self.deviation).aggregate(Max('order'))['order__max']
            self.order = (last_order or 0) + 1
        super().save(*args, **kwargs)

    def __str__(self):
        # Update __str__ to reflect potential multiple users
        # If action_responsible_users is populated, use that. Otherwise, fall back to action_responsible (CharField).
        if self.action_responsible_users.exists():
            responsible_names = ", ".join([user.username for user in self.action_responsible_users.all()])
            return f"Action {self.order} for DEV {self.deviation.dev_number}: {self.action_description[:50]}... ({responsible_names})"
        elif self.action_responsible:
            return f"Action {self.order} for DEV {self.deviation.dev_number}: {self.action_description[:50]}... ({self.action_responsible})"
        else:
            return f"Action {self.order} for DEV {self.deviation.dev_number}: {self.action_description[:50]}..."
