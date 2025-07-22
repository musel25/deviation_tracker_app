# deviations/migrations/0005_alter_action_options_action_order_and_more.py (MODIFIED)

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('deviations', '0004_action_action_responsible_user_and_more'), # Ensure this is correct
    ]

    operations = [
        migrations.AlterModelOptions(
            name='action',
            options={'ordering': ['order', 'id'], 'verbose_name_plural': 'Actions'},
        ),
        migrations.AddField(
            model_name='action',
            name='order',
            field=models.PositiveIntegerField(default=0),
        ),
        # REMOVE THE FOLLOWING BLOCK (migrations.AlterUniqueTogether) if it exists:
        # migrations.AlterUniqueTogether(
        #     name='action',
        #     unique_together={('deviation', 'order')},
        # ),
    ]