# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.shortcuts import redirect, render

# Create your views here.


def poseindon_app(request, rest):
    if not rest:
        return render(request, template_name='app.html')
    return redirect('/static/app/{}'.format(rest))
