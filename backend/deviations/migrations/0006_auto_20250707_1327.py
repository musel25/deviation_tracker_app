# deviation_tracker_app/deviation_backend/deviations/migrations/0006_auto_YYYYMMDD_HHMM.py (YOUR NEW MIGRATION FILE)

from django.db import migrations, models
from django.db.models import F # Import F for database operations

def populate_action_order(apps, schema_editor):
    Deviation = apps.get_model('deviations', 'Deviation')
    Action = apps.get_model('deviations', 'Action')

    # Iterate through each Deviation
    for deviation in Deviation.objects.all():
        # Get all actions for this specific deviation, ordered by their current ID
        # (which is usually creation order, providing a stable initial order)
        actions_for_dev = Action.objects.filter(deviation=deviation).order_by('id')

        # Assign sequential order numbers
        for i, action in enumerate(actions_for_dev):
            action.order = i + 1 # Start order from 1
            action.save(update_fields=['order']) # Save only the 'order' field to avoid recursion with model's save method

class Migration(migrations.Migration):

    dependencies = [
        ('deviations', '0005_alter_action_options_action_order_and_more'), # <--- ENSURE THIS IS YOUR PREVIOUS MIGRATION NUMBER
    ]

    operations = [
        migrations.RunPython(populate_action_order, reverse_code=migrations.RunPython.noop),
    ]
