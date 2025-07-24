# deviation_tracker_app/deviation_backend/deviations/serializers.py (UPDATED - With Delayed Status)

from rest_framework import serializers
from .models import Deviation, Action
from django.contrib.auth.models import User
from datetime import date


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']


class ActionSerializer(serializers.ModelSerializer):
    action_responsible_users = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=User.objects.all(),
        required=False,
        allow_null=True
    )

    class Meta:
        model = Action
        fields = [
            'id',
            'action_description',
            'action_responsible',
            'action_responsible_users',
            'action_expiration_date',
            'reminder_sent',
            'deviation',
            'status',
            'order'
        ]
        read_only_fields = ['deviation']

    # UPDATED: Override to_representation for read-only display (to show full names)
    def to_representation(self, instance):
        representation = super().to_representation(instance)

        # For displaying, convert the list of user IDs to full names
        if 'action_responsible_users' in representation and instance.action_responsible_users.exists():
            responsible_full_names = []
            for user in instance.action_responsible_users.all():
                full_name = f"{user.first_name or ''} {user.last_name or ''}".strip()
                responsible_full_names.append(full_name if full_name else user.username) # Fallback to username if no full name
            
            representation['action_responsible_users'] = responsible_full_names
        return representation


class DeviationSerializer(serializers.ModelSerializer):
    actions = ActionSerializer(many=True, read_only=True)
    deviation_status = serializers.SerializerMethodField()
    completion_percentage = serializers.SerializerMethodField()

    created_by_user = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        required=False, allow_null=True
    )

    attachment = serializers.FileField(required=False, allow_null=True)

    class Meta:
        model = Deviation
        fields = [
            'id', 'primary_column', 'year', 'dev_number', 'created_by', 'created_by_user',
            'owner_plant', 'affected_plant', 'sbu', 'release_date', 'effectivity_date', 'expiration_date',
            'drawing_number', 'back_to_back_deviation', 'defect_category',
            'assembly_defect_type', 'molding_defect_type', 'actions', 'attachment',
            'deviation_status',
            'completion_percentage'
        ]
        lookup_field = 'dev_number'

    def get_deviation_status(self, obj):
        all_actions = obj.actions.all()

        if not all_actions.exists():
            # Check if deviation is delayed (expiration date passed and no actions)
            if obj.expiration_date and obj.expiration_date < date.today():
                return "Delayed"
            return "Not Started"

        action_statuses = [action.status for action in all_actions]

        # First check if all actions are done
        if all(status == "Done" for status in action_statuses):
            return "Done"

        # For In Progress or Not Started, check if delayed
        current_status = None
        if "In Progress" in action_statuses:
            current_status = "In Progress"
        elif all(status == "Not Started" for status in action_statuses):
            current_status = "Not Started"
        else:
            current_status = "In Progress"

        # Check if deviation is delayed (expiration date passed and not done)
        if obj.expiration_date and obj.expiration_date < date.today():
            return "Delayed"

        return current_status

    def get_completion_percentage(self, obj):
        all_actions = obj.actions.all()
        total_actions = all_actions.count()

        if total_actions == 0:
            return 0

        done_actions = all_actions.filter(status="Done").count()

        percentage = (done_actions / total_actions) * 100
        return round(percentage)